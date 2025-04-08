const db = require('../config/db'); // This should be a promise-based connection

// Get all unverified voters
exports.getPendingVoters = async (req, res) => {
    try {
        console.log("Fetching pending voters...");
        const [rows] = await db.query('SELECT * FROM voters WHERE isVerified = 0');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Error fetching voters", error: err });
    }
};

// Verify a voter by ID
exports.verifyVoter = async (req, res) => {
    const voterID = req.params.voterID;
    try {
        const [result] = await db.query('UPDATE voters SET isVerified = 1 WHERE voterID = ?', [voterID]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Voter not found" });
        }

        res.json({ success: true, message: `Voter ${voterID} verified.` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Verification failed", error: err });
    }
};
