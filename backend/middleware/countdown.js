// middleware/verifyAdmin.js
const pool = require("../config/db");

const countdownController = async (req, res, next) => {
    const { adminID } = req.body || req.params;

    if (!adminID) {
        return res.status(400).json({ message: "Missing admin ID" });
    }

    try {
        const [result] = await pool.query("SELECT role FROM users WHERE id = ?", [adminID]);

        if (result.length === 0 || result[0].role !== 'admin') {
            return res.status(403).json({ message: "Access denied: not an admin" });
        }

        next();
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

module.exports = countdownController;
