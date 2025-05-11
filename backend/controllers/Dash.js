const db = require("../config/db");


// Fetch total voters count
exports.gettotalVoters = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT COUNT(*) AS totalVoters FROM voters');
        res.status(200).json(rows[0] || { totalVoters: 0 });
    } catch (err) {
        res.status(500).json({ error: "Error fetching total voters: " + err.message });
    }
};

// Fetch all elections
exports.getAllElections = async (req, res) => {
    try {
        const [results] = await db.query("SELECT id, name FROM election_times ORDER BY start_time DESC");
        res.status(200).json(results);
    } catch (error) {
        console.error("Error fetching elections:", error);
        res.status(500).json({ error: "Error fetching elections" });
    }
};

// Fetch candidates for a specific election
exports.getCandidates = async (req, res) => {
    const { electionId } = req.params;
    try {
        const [rows] = await db.execute(`
            SELECT id, name, party, age, qualification, promises, photo 
            FROM candidates WHERE election_id = ?
        `, [electionId]);

        res.json(rows || []);
    } catch (err) {
        console.error("Error fetching candidates:", err);
        res.status(500).json({ error: "Error fetching candidates" });
    }
};


// Fetch total votes cast for a specific election
exports.getTotalVotesByElection = async (req, res) => {
    const { electionId } = req.params;
    try {
        const [rows] = await db.execute(`
            SELECT SUM(vote_count) AS totalVotes 
            FROM candidates WHERE election_id = ?
        `, [electionId]);

        res.json(rows[0] || { totalVotes: 0 });
    } catch (error) {
        console.error("Error fetching total votes:", error);
        res.status(500).json({ error: "Error fetching total votes" });
    }
};

// Fetch election start and end time
exports.getElectionEndTime = async (req, res) => {
    const { electionId } = req.params;

    const query = `
        SELECT end_time, start_time
        FROM election_times
        WHERE id = ? LIMIT 1
    `;

    try {
        const [result] = await db.query(query, [electionId]);

        if (result.length === 0) {
            return res.status(404).json({ message: 'Election not found with this ID.' });
        }

        res.json(result[0]);
    } catch (err) {
        console.error("Error fetching election time:", err);
        res.status(500).json({ error: "Error fetching election time" });
    }
};

// Fetch candidate names and vote counts for a specific election
exports.getLiveVotes = async (req, res) => {
    const { electionId } = req.params;
    try {
        const [rows] = await db.execute(`
            SELECT name, vote_count 
            FROM candidates 
            WHERE election_id = ?
        `, [electionId]);

        res.json(rows || []);
    } catch (error) {
        console.error("Error fetching live votes:", error);
        res.status(500).json({ error: "Error fetching live votes" });
    }
};


