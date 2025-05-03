const db = require("../config/db");
const blockchain = require("../blockchain/blockchain");
const crypto = require("crypto");

// Get all candidates for a specific election
exports.getCandidates = async (req, res) => {
    try {
        // Get electionId from params or query parameters (handle both cases)
        const electionId = req.params.electionId || req.query.electionID;
        
        // Validate electionId
        if (!electionId) {
            console.error("Missing election ID in request");
            return res.status(400).json({ error: "Election ID is required" });
        }
        
        // Parse electionId to ensure it's a number
        const parsedElectionId = parseInt(electionId, 10);
        
        if (isNaN(parsedElectionId)) {
            console.error("Invalid election ID:", electionId);
            return res.status(400).json({ error: "Invalid election ID format" });
        }
        
        console.log(`Fetching candidates for election ID: ${parsedElectionId}`);
        
        // Execute the query with the parsed ID
        const [rows] = await db.execute(`
            SELECT id, name, party, age, qualification, promises, photo 
            FROM candidates WHERE election_id = ?
        `, [parsedElectionId]);
        
        console.log(`Found ${rows.length} candidates for election ID: ${parsedElectionId}`);
        
        // If no candidates are found, check if the election exists
        if (rows.length === 0) {
            const [election] = await db.execute(`
                SELECT id, name FROM election_times WHERE id = ?
            `, [parsedElectionId]);
            
            if (election.length > 0) {
                console.log(`Election "${election[0].name}" exists but has no candidates`);
            } else {
                console.log(`No election found with ID: ${parsedElectionId}`);
            }
        }
        
        // Return the candidates (empty array if none found)
        res.json(rows || []);
        
    } catch (err) {
        console.error("Error fetching candidates:", err);
        res.status(500).json({ error: "Error fetching candidates", details: err.message });
    }
};

// Get all available elections
exports.getElections = async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM election_times WHERE status = "ongoing"');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get elections a specific voter hasn't voted for yet
exports.getAvailableElections = async (req, res) => {
  try {
    const { voterID } = req.query;

    if (!voterID) {
      return res.status(400).json({ message: "Voter ID is required" });
    }

    const [rows] = await db.execute(`
      SELECT e.* FROM election_times e
      WHERE e.status = 'ongoing'
      AND e.id NOT IN (
        SELECT electionID FROM votes_log WHERE voterID = ?
      )
    `, [voterID]);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get election start and end time for a specific election
exports.getElectionTime = async (req, res) => {
  try {
    const electionID = req.query.electionID;

    if (!electionID) {
      return res.status(400).json({ message: "Election ID is required" });
    }

    const [rows] = await db.execute("SELECT start_time, end_time FROM election_times WHERE id = ?", [electionID]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Election not found." });
    }

    res.json({
      start_time: new Date(rows[0].start_time).toISOString(),
      end_time: new Date(rows[0].end_time).toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Check if voter has already voted in a specific election
exports.checkVoterStatus = async (req, res) => {
  try {
    const { voterID, electionID } = req.query;
    
    if (!voterID || !electionID) {
      return res.status(400).json({ message: "Voter ID and Election ID are required" });
    }
    
    const [rows] = await db.execute(
      "SELECT * FROM votes_log WHERE voterID = ? AND electionID = ?", 
      [voterID, electionID]
    );
    
    res.json({
      has_voted: rows.length > 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all elections the voter has already voted in
exports.getVoterElectionHistory = async (req, res) => {
  try {
    const { voterID } = req.query;
    
    if (!voterID) {
      return res.status(400).json({ message: "Voter ID is required" });
    }
    
    console.log("Getting voting history for voter:", voterID);
    
    const [rows] = await db.execute(`
      SELECT v.voteID, v.voterID, v.electionID, v.vote_time, e.name as title, e.description
      FROM votes_log v
      LEFT JOIN election_times e ON v.electionID = e.id
      WHERE v.voterID = ?
      ORDER BY v.vote_time DESC
    `, [voterID]);
    
    console.log("Voting history records found:", rows.length);
    res.json(rows);
  } catch (err) {
    console.error("Error in getVoterElectionHistory:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.castVote = async (req, res) => {
  const { voterID, candidateID, electionID } = req.body;

  if (!voterID || !candidateID || !electionID) {
    return res.status(400).json({ 
      message: "Invalid vote data. VoterID, candidateID, and electionID are required." 
    });
  }

  // Parse IDs to ensure they're in the correct format
  const parsedElectionID = parseInt(electionID, 10);
  const parsedCandidateID = parseInt(candidateID, 10);

  try {
    // Check if the voter exists and is verified
    const [voter] = await db.execute(
      "SELECT isVerified FROM voters WHERE voterID = ?", 
      [voterID]
    );

    if (voter.length === 0) {
      return res.status(404).json({ message: "Voter not found." });
    }

    if (voter[0].isVerified !== 1) {
      return res.status(403).json({ 
        message: "You are not verified to vote. Please verify your identity." 
      });
    }

    // Check if the voter has already voted in this specific election
    const [voteCheck] = await db.execute(
      "SELECT * FROM votes_log WHERE voterID = ? AND electionID = ?", 
      [voterID, parsedElectionID]
    );

    if (voteCheck.length > 0) {
      return res.status(400).json({ 
        message: "You have already voted in this election." 
      });
    }

    // Check if the candidate belongs to the specified election
    const [candidateCheck] = await db.execute(
      'SELECT * FROM candidates WHERE id = ? AND election_id = ?',
      [parsedCandidateID, parsedElectionID]
    );

    if (candidateCheck.length === 0) {
      return res.status(400).json({ 
        message: "Invalid candidate for this election." 
      });
    }

    // Check if the election is active and within the voting period
    const [electionCheck] = await db.execute(
      "SELECT * FROM election_times WHERE id = ? AND status = 'ongoing' AND NOW() BETWEEN start_time AND end_time", 
      [parsedElectionID]
    );

    if (electionCheck.length === 0) {
      return res.status(400).json({ 
        message: "This election is not currently active or voting period has ended." 
      });
    }

    // Create a connection with the pool to handle transaction
    const connection = await db.getConnection();
    
    try {
      // Start a transaction using the connection directly
      await connection.beginTransaction();

      // Log the vote in votes_log table
      await connection.execute(
        "INSERT INTO votes_log (voterID, electionID, vote_time) VALUES (?, ?, NOW())", 
        [voterID, parsedElectionID]
      );

      // Increment candidate vote count
      await connection.execute(
        "UPDATE candidates SET vote_count = vote_count + 1 WHERE id = ?", 
        [parsedCandidateID]
      );

      // Commit the transaction
      await connection.commit();
      
      // Release the connection back to the pool
      connection.release();

      // 🔒 Hash voterID for privacy on blockchain
      const hashedVoterID = crypto.createHash("sha256").update(voterID).digest("hex");

      // ✅ Add block to blockchain
      const result = await blockchain.addBlock({ 
        voter: hashedVoterID, 
        candidate: parsedCandidateID,
        election: parsedElectionID,
        timestamp: new Date()
      });

      // Log the result
      console.log("Blockchain block added:", result);

      return res.status(200).json({ 
        message: "Your vote has been cast successfully!", 
        block: result 
      });

    } catch (err) {
      // If anything fails, rollback the transaction
      await connection.rollback();
      connection.release();
      throw err;
    }

  } catch (err) {
    console.error("Error casting vote:", err);
    return res.status(500).json({ 
      message: err.message || "Something went wrong while casting your vote." 
    });
  }
};

// Get election results for a specific election
exports.getElectionResults = async (req, res) => {
  try {
    const electionID = req.query.electionID;

    if (!electionID) {
      return res.status(400).json({ message: "Election ID is required" });
    }

    const parsedElectionID = parseInt(electionID, 10);

    const [rows] = await db.execute(`
      SELECT c.id, c.name, c.party, c.vote_count, 
             (SELECT COUNT(*) FROM votes_log WHERE electionID = ?) as total_votes
      FROM candidates c 
      WHERE c.election_id = ?
      ORDER BY c.vote_count DESC
    `, [parsedElectionID, parsedElectionID]);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};