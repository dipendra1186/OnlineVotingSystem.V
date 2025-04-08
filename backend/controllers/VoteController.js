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
        const [rows] = await db.execute("SELECT * FROM election_time");
        if (rows.length === 0) {
            return res.status(404).json({ message: "Election time not set." });
        }

        res.json({
            start_time: rows[0].start_time,
            end_time: rows[0].end_time,
        });
    } catch (error) {
        console.error("Error fetching election time:", error);
        res.status(500).json({ message: "Failed to fetch election time" });
    }
};

// Cast vote
exports.castVote = async (req, res) => {
    const { voterId, candidateID } = req.body;

    if (!voterId || !candidateID) {
        return res.status(400).json({ message: "Voter ID and Candidate ID are required." });
    }

    try {
        // Check if election is currently active
        const [timeRows] = await db.execute("SELECT * FROM election_time");
        if (timeRows.length > 0) {
            const now = new Date();
            const startTime = new Date(timeRows[0].start_time);
            const endTime = new Date(timeRows[0].end_time);

            if (now < startTime) {
                return res.status(400).json({ message: "Election has not started yet." });
            }
            if (now > endTime) {
                return res.status(400).json({ message: "Election has ended." });
            }
        }

        // Check if voter exists
        const [voterRows] = await db.execute("SELECT has_voted FROM voters WHERE id = ?", [voterId]);
        if (voterRows.length === 0) {
            return res.status(404).json({ message: "Voter not found." });
        }

        if (voterRows[0].has_voted) {
            return res.status(400).json({ message: "You have already voted." });
        }

        // Check if candidate exists
        const [candidateRows] = await db.execute("SELECT id FROM candidates WHERE id = ?", [candidateID]);
        if (candidateRows.length === 0) {
            return res.status(404).json({ message: "Candidate not found." });
        }

        // Start a transaction for data consistency
        await db.beginTransaction();

        try {
            // Record the vote
            await db.execute("INSERT INTO votes (voter_id, candidate_id) VALUES (?, ?)", [voterId, candidateID]);
            await db.execute("UPDATE voters SET has_voted = TRUE WHERE id = ?", [voterId]);
            await db.execute("UPDATE candidates SET vote_count = vote_count + 1 WHERE id = ?", [candidateID]);
            
            await db.commit();
            res.json({ message: "Vote cast successfully." });
        } catch (error) {
            await db.rollback();
            throw error;
        }
    } catch (error) {
        console.error("Vote error:", error);
        res.status(500).json({ message: "An error occurred while casting the vote." });
    }
};