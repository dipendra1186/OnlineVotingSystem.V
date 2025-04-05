const db = require("../config/db"); // Import your DB connection pool

// ✅ Create a new candidate
exports.createCandidate = async (req, res) => {
    try {
        console.log(req.body); // Check the incoming data

        const { name, party, age, qualification, promises, photo } = req.body;
        if (!name || !party || !age || !qualification || !promises || !photo) {
            return res.status(400).json({ error: "All fields are required" });
        }

        const sql = "INSERT INTO candidates (name, party, age, qualification, promises, photo) VALUES (?, ?, ?, ?, ?, ?)";
        const [result] = await db.execute(sql, [name, party, age, qualification, promises, photo]);

        res.status(201).json({ success: true, candidate: { id: result.insertId, name, party, age, qualification, promises, photo } });
    } catch (error) {
        console.error("Error saving candidate:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};


// ✅ Get all candidates
exports.getCandidates = async (req, res) => {
    try {
        const [candidates] = await db.execute("SELECT * FROM candidates"); // Use `execute`
        res.status(200).json(candidates);
    } catch (error) {
        console.error("Error fetching candidates:", error);
        res.status(500).json({ error: "Database error" });
    }
};

// ✅ Get a candidate by ID
exports.getCandidateById = async (req, res) => {
    const { id } = req.params;
    try {
        const [candidate] = await db.execute("SELECT * FROM candidates WHERE id = ?", [id]); // Use `execute`
        if (candidate.length === 0) {
            return res.status(404).json({ error: "Candidate not found" });
        }
        res.status(200).json(candidate[0]);
    } catch (error) {
        console.error("Error fetching candidate:", error);
        res.status(500).json({ error: "Database error" });
    }
};

// ✅ Update a candidate
exports.updateCandidate = async (req, res) => {
    const { id } = req.params;
    const { name, party, age, qualification, promises, photo } = req.body;
    try {
        const sql = "UPDATE candidates SET name=?, party=?, age=?, qualification=?, promises=?, photo=? WHERE id=?";
        await db.execute(sql, [name, party, age, qualification, promises, photo, id]); // Use `execute`
        res.status(200).json({ message: "Candidate updated successfully!" });
    } catch (error) {
        console.error("Error updating candidate:", error);
        res.status(500).json({ error: "Database error" });
    }
};

// ✅ Delete a candidate
exports.deleteCandidate = async (req, res) => {
    const { id } = req.params;
    try {
        await db.execute("DELETE FROM candidates WHERE id=?", [id]); // Use `execute`
        res.status(200).json({ message: "Candidate deleted successfully!" });
    } catch (error) {
        console.error("Error deleting candidate:", error);
        res.status(500).json({ error: "Database error" });
    }
};
