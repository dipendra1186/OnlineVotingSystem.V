const db = require("../config/db");

// Set election start and end time
exports.setElectionTime = (req, res) => {
    const { adminId, startTime, endTime } = req.body;

    if (!adminId || !startTime || !endTime) {
        return res.status(400).json({ message: "All fields are required" });
    }

    const sql = "UPDATE admins SET election_start_time = ?, election_end_time = ? WHERE admin_id = ?";
    db.query(sql, [startTime, endTime, adminId], (err, result) => {
        if (err) return res.status(500).json({ message: "Database error", error: err });
        return res.status(200).json({ message: "Election time set successfully" });
    });
};

// Get election time for admin
exports.getElectionTime = (req, res) => {
    const adminId = req.params.adminId;

    const sql = "SELECT election_start_time, election_end_time FROM admins WHERE admin_id = ?";
    db.query(sql, [adminId], (err, result) => {
        if (err) return res.status(500).json({ message: "Database error", error: err });
        if (result.length === 0) return res.status(404).json({ message: "Admin not found" });

        return res.status(200).json({
            startTime: result[0].election_start_time,
            endTime: result[0].election_end_time
        });
    });
};

// Cancel election time
exports.cancelElectionTime = (req, res) => {
    const adminId = req.body.adminId;

    const sql = "UPDATE admins SET election_start_time = NULL, election_end_time = NULL WHERE admin_id = ?";
    db.query(sql, [adminId], (err, result) => {
        if (err) return res.status(500).json({ message: "Database error", error: err });
        return res.status(200).json({ message: "Election time cancelled successfully" });
    });
};
