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

// Fetch total votes per candidate
exports.getVotes = async (req, res) => {
    db.query('SELECT candidate_id, COUNT(*) AS votes FROM votes GROUP BY candidate_id', (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(result);
    });
};

// Fetch election end time
exports.getElectionEndTime = async (req, res) => {
    db.query('SELECT end_time FROM election_settings LIMIT 1', (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(result[0]);
    });
};

// Fetch voter details
exports.getVoterDetails = async (req, res) => {
    const { voterID } = req.params;
    db.query('SELECT fullName, age, gender, email, voterID FROM voters WHERE voterID = ?', [voterID], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(result[0] || {});
    });
};

// Cast a vote
exports.castVote = (req, res) => {
    const { voterID, candidate_id } = req.body;
    
    // Check if voter has already voted
    db.query('SELECT * FROM votes WHERE voter_id = ?', [voterID], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        if (results.length > 0) {
            return res.status(400).json({ error: 'You have already voted!' });
        }

        // Insert vote
        db.query('INSERT INTO votes (voter_id, candidate_id) VALUES (?, ?)', [voterID, candidate_id], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Vote cast successfully' });
        });
    });
};
