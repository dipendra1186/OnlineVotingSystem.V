const db = require("../config/db"); // mysql2 promise connection

const getResults = async (req, res) => {
    try {
        const [electionRows] = await db.query('SELECT * FROM election_times');
        if (electionRows.length === 0) {
            return res.status(404).json({ message: 'Election time not found' });
        }

        const electionStatus = electionRows[0].status;
        if (electionStatus !== 'ended') {
            return res.status(403).json({ message: 'Election is still ongoing' });
        }

        const [candidates] = await db.query('SELECT * FROM candidates ORDER BY vote_count DESC');

        res.json({
            electionStatus,
            candidates
        });
    } catch (err) {
        console.error("Error fetching results:", err);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = getResults;
