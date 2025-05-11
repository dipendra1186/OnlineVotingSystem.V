// controllers/results.js
const db = require('../config/db');

exports.getEndedElections = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, name FROM election_times WHERE status = "ended"');
        res.json(rows);
    } catch (err) {
        console.error("Error fetching ended elections:", err);
        res.status(500).json({ message: "Server error" });
    }
};

exports.getElectionResults = async (req, res) => {
    try {
        const electionId = req.query.electionId;

        if (!electionId) {
            return res.status(400).json({ message: 'Election ID is required' });
        }

        const [electionRows] = await db.query('SELECT * FROM election_times WHERE id = ? AND status = "ended"', [electionId]);

        if (electionRows.length === 0) {
            return res.status(404).json({ message: 'Election not found or not ended' });
        }

        const election = electionRows[0];

        const [candidates] = await db.query(
            'SELECT name, vote_count FROM candidates WHERE election_id = ? ORDER BY vote_count DESC',
            [electionId]
        );

        res.json({
            electionStatus: election.status,
            electionName: election.name,
            candidates
        });
    } catch (err) {
        console.error("Error fetching election results:", err);
        res.status(500).json({ message: "Server error" });
    }
};


