// routes/election.js
const express = require("express");
const pool = require("../config/db");
const router = express.Router();

router.get("/approve-election", async (req, res) => {
    const { adminID } = req.query;

    if (!adminID) {
        return res.status(400).send("Missing admin ID");
    }

    try {
        // 🟡 Clear previous election times (optional)
        await pool.query("DELETE FROM election_times");

        // 🟢 Or alternatively, you could update a 'pending_approval' field or log the approval

        return res.send(`<h2>✅ Admin ${adminID} has approved the election time. You can now set a new one!</h2>`);
    } catch (error) {
        console.error("Error updating approval:", error);
        return res.status(500).send("Server error");
    }
});

module.exports = router;
