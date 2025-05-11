const db = require("../config/db"); // Import your DB connection pool only once


// ✅ Create a new candidate with election_id
exports.createCandidate = async (req, res) => {
    try {
        console.log(req.body); // Check the incoming data

        const { name, party, age, qualification, promises, photo, election_id } = req.body;
        
        // Check if required fields are present
        if (!name || !party || !age || !qualification || !promises || !photo) {
            return res.status(400).json({ error: "All fields are required" });
        }

        // If election_id is provided, include it in the SQL query
        let sql, params;
        if (election_id) {
            sql = "INSERT INTO candidates (name, party, age, qualification, promises, photo, election_id) VALUES (?, ?, ?, ?, ?, ?, ?)";
            params = [name, party, age, qualification, promises, photo, election_id];
        } else {
            sql = "INSERT INTO candidates (name, party, age, qualification, promises, photo) VALUES (?, ?, ?, ?, ?, ?)";
            params = [name, party, age, qualification, promises, photo];
        }

        const [result] = await db.execute(sql, params);

        // Include election_id in the response if it was provided
        const candidate = { 
            id: result.insertId, 
            name, 
            party, 
            age, 
            qualification, 
            promises, 
            photo
        };
        
        if (election_id) {
            candidate.election_id = election_id;
        }

        res.status(201).json({ success: true, candidate });
    } catch (error) {
        console.error("Error saving candidate:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// ✅ Get all candidates with optional election filter
exports.getCandidates = async (req, res) => {
    try {
        const { election_id } = req.query;
        let sql = "SELECT * FROM candidates";
        let params = [];
        
        // Filter by election_id if provided
        if (election_id) {
            sql += " WHERE election_id = ?";
            params.push(election_id);
        }
        
        const [candidates] = await db.execute(sql, params);
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
        const [candidate] = await db.execute("SELECT * FROM candidates WHERE id = ?", [id]);
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
    const { name, party, age, qualification, promises, photo, election_id } = req.body;
    
    try {
        let sql, params;
        
        // Include election_id in update if provided
        if (election_id !== undefined) {
            sql = "UPDATE candidates SET name=?, party=?, age=?, qualification=?, promises=?, photo=?, election_id=? WHERE id=?";
            params = [name, party, age, qualification, promises, photo, election_id, id];
        } else {
            sql = "UPDATE candidates SET name=?, party=?, age=?, qualification=?, promises=?, photo=? WHERE id=?";
            params = [name, party, age, qualification, promises, photo, id];
        }
        
        await db.execute(sql, params);
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
        await db.execute("DELETE FROM candidates WHERE id=?", [id]);
        res.status(200).json({ message: "Candidate deleted successfully!" });
    } catch (error) {
        console.error("Error deleting candidate:", error);
        res.status(500).json({ error: "Database error" });
    }
};

// ✅ Get all elections
exports.getElections = async (req, res) => {
    try {
        const [elections] = await db.execute("SELECT * FROM election_times ORDER BY start_time DESC");
        res.status(200).json(elections);
    } catch (error) {
        console.error("Error fetching elections:", error);
        res.status(500).json({ error: "Database error" });
    }
};