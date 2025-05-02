const db = require("../config/db");
const blockchain = require("../blockchain/blockchain");
const crypto = require("crypto");

// Get all candidates
exports.getCandidates = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM candidates');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get election start and end time
exports.getElectionTime = async (req, res) => {
    try {
        const [rows] = await db.execute("SELECT * FROM election_times LIMIT 1");

        if (rows.length === 0) {
            return res.status(404).json({ message: "Election time not set." });
        }

        const startTime = new Date(rows[0].start_time).toISOString();
        const endTime = new Date(rows[0].end_time).toISOString();

        res.json({
            start_time: startTime,
            end_time: endTime,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.castVote = async (req, res) => {
    const { voterID, candidateID } = req.body;

    if (!voterID || !candidateID) {
        return res.status(400).json({ message: "Invalid vote data. Both voterID and candidateID are required." });
    }

    try {
        // Check if the voter exists and get their voting and verification status
            const [voter] = await db.execute("SELECT has_voted, isVerified FROM voters WHERE voterID = ?", [voterID]);

            if (voter.length === 0) {
                return res.status(404).json({ message: "Voter not found." });
            }

            if (voter[0].isVerified !== 1) {
                return res.status(403).json({ message: "You are not verified to vote. Please verify your identity." });
            }


        if (voter[0].has_voted === 1) {
            return res.status(400).json({ message: "You have already voted." });
        }

        // Mark as voted and increment candidate vote count
        await db.execute("UPDATE voters SET has_voted = 1 WHERE voterID = ?", [voterID]);
        await db.execute("UPDATE candidates SET vote_count = vote_count + 1 WHERE id = ?", [candidateID]);

        // 🔒 Hash voterID for privacy
        const hashedVoterID = crypto.createHash("sha256").update(voterID).digest("hex");

        // ✅ Log the vote data for debugging
        console.log("Hashed Voter ID:", hashedVoterID);
        console.log("Candidate ID:", candidateID);

        // ✅ Add block to blockchain once and await
        const result = await blockchain.addBlock({ voter: hashedVoterID, candidate: candidateID });

        // Log the result
        console.log("Blockchain block added:", result);

        return res.status(200).json({ message: "Your vote has been cast successfully!", block: result });

    } catch (err) {
        // Log the error for debugging
        console.error("Error casting vote:", err);

        // Return a detailed error message in the response
        return res.status(500).json({ message: err.message || "Something went wrong while casting your vote." });
    }
};

