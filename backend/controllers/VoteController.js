const db = require("../config/db");

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
        return res.status(400).json({ message: "Invalid vote data. Please ensure both voter ID and candidate are provided." });
    }

    try {
        console.log("Voter ID:", voterID, "Candidate ID:", candidateID);

        const [voter] = await db.execute("SELECT has_voted FROM voters WHERE voterID = ?", [voterID]);
        console.log("Voter Check Result:", voter);

        if (voter.length === 0) {
            return res.status(404).json({ message: "Voter not found." });
        }

        if (voter[0].has_voted === 1) {
            return res.status(400).json({ message: "You have already voted." });
        }

        // Mark voter as voted
        await db.execute("UPDATE voters SET has_voted = 1 WHERE voterID = ?", [voterID]);

        // Correctly increment vote_count in candidates table
        await db.execute("UPDATE candidates SET vote_count = vote_count + 1 WHERE id = ?", [candidateID]);

        res.json({ message: "Your vote has been cast successfully!" });
    } catch (err) {
        console.error("Error casting vote:", err);
        res.status(500).json({ message: "Internal server error while casting vote." });
    }
};

