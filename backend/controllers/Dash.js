const db = require("../config/db");

// Fetch total voters
exports.gettotalVoters = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT COUNT(*) AS totalVoters FROM voters');
        res.status(200).json(rows[0] || { totalVoters: 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


// Fetch all candidates
exports.getCandidates = async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT id, name, party, age, qualification, promises, photo, created_at FROM candidates
        `);
        res.json(rows || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// http://localhost:3000/api/dashboard/getVotes
exports.getVotes = async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT id AS candidate_id, name, vote_count AS total_votes
            FROM candidates
            ORDER BY total_votes DESC
        `);
        res.json(rows || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};



// http://localhost:3000/api/dashboard/electionEndTime 

exports.getElectionEndTime = async (req, res) => {
    const query = `
        SELECT end_time, start_time 
        FROM election_times 
        WHERE status = 'ongoing' 
        ORDER BY created_at DESC 
        LIMIT 1
    `;
    
    try {
        const [result] = await db.query(query);  // Using await for promise-based query
        
        if (result.length === 0) {
            return res.status(404).json({ message: 'No ongoing election found.' });
        }

        res.json(result[0]); // Send back the start_time and end_time
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.message });
    }
};




// Cast a vote
exports.castVote = async (req, res) => {
    const { voterID, candidate_id } = req.body;
    
    try {
        // Check if the voter has already voted
        const [existingVote] = await db.query('SELECT * FROM votes WHERE voter_id = ?', [voterID]);

        if (existingVote.length > 0) {
            return res.status(400).json({ error: 'You have already voted!' });
        }

        // Insert the vote
        await db.query('INSERT INTO votes (voter_id, candidate_id) VALUES (?, ?)', [voterID, candidate_id]);
        
        res.json({ message: 'Vote cast successfully' });
    } catch (err) {
        console.error("Error casting vote:", err);
        res.status(500).json({ error: 'Server error' });
    }
};

