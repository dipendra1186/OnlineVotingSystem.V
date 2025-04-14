// controllers/countdown.js
const pool = require("../config/db.js");

// Set election start and end time
const setElectionTime = async (req, res) => {
    try {
        const { adminID, startTime, endTime } = req.body;

        if (!adminID || !startTime || !endTime) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        // Check if election time already exists for this admin
        const [existing] = await pool.query(
            "SELECT * FROM election_times WHERE admin_id = ?",
            [adminID]
        );

        if (existing.length > 0) {
            // Update existing record
            await pool.query(
                "UPDATE election_times SET start_time = ?, end_time = ? WHERE admin_id = ?",
                [startTime, endTime, adminID]
            );
            return res.status(200).json({ message: "Election time updated successfully" });
        } else {
            // Insert new record
            await pool.query(
                "INSERT INTO election_times (admin_id, start_time, end_time) VALUES (?, ?, ?)",
                [adminID, startTime, endTime]
            );
            return res.status(201).json({ message: "Election time set successfully" });
        }
    } catch (error) {
        console.error("Error setting election time:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get election start and end time
const getElectionTime = async (req, res) => {
    try {
        console.log("Getting election time for admin:", req.params.adminID);
        const adminID = req.params.adminID;

        if (!adminID) {
            console.log("No adminID provided");
            return res.status(400).json({ message: "Admin ID is required" });
        }

        console.log("Querying database for admin:", adminID);
        const [result] = await pool.query(
            "SELECT start_time, end_time FROM election_times WHERE admin_id = ?",
            [adminID]
        );
        console.log("Query result:", result);

        if (result.length === 0) {
            console.log("No election time found for admin:", adminID);
            return res.status(404).json({ message: "No election time found for this admin" });
        }

        console.log("Returning election times for admin:", adminID);
        return res.status(200).json({
            startTime: result[0].start_time,
            endTime: result[0].end_time
        });
    } catch (error) {
        console.error("Error getting election time:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};


// Delete election time
const deleteElectionTime = async (req, res) => {
    try {
        const adminID = req.params.adminID;

        if (!adminID) {
            return res.status(400).json({ message: "Admin ID is required" });
        }

        await pool.query(
            "DELETE FROM election_times WHERE admin_id = ?",
            [adminID]
        );

        return res.status(200).json({ message: "Election time deleted successfully" });
    } catch (error) {
        console.error("Error deleting election time:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

const updateElectionStatus = async () => {
    try {
        const [electionRows] = await pool.query('SELECT * FROM election_times ORDER BY id DESC LIMIT 1');

        if (electionRows.length === 0) {
            console.error('❌ No election time found in database.');
            return;
        }

        const { id, end_time, start_time, status } = electionRows[0];
        const currentTime = new Date();
        const electionEndTime = new Date(end_time);
        const electionStartTime = new Date(start_time);

        console.log(`🕐 Start: ${electionStartTime.toISOString()}`);
        console.log(`🕐 End: ${electionEndTime.toISOString()}`);
        console.log(`⏰ Now: ${currentTime.toISOString()}`);

        let newStatus = status;

        if (currentTime < electionStartTime) {
            newStatus = 'upcoming';
        } else if (currentTime >= electionStartTime && currentTime < electionEndTime) {
            newStatus = 'ongoing';
        } else if (currentTime >= electionEndTime) {
            newStatus = 'ended';
        }

        // Only update if status actually changed
        if (newStatus !== status) {
            await pool.query('UPDATE election_times SET status = ?, updated_at = NOW() WHERE id = ?', [newStatus, id]);
            console.log(`✅ Election status updated to: ${newStatus}`);

        } else {
            console.log(`ℹ️ Status remains "${status}"`);
        }
    } catch (err) {
        console.error("🚨 Error updating election status:", err);
    }
};

setInterval(updateElectionStatus, 1000); // every second



module.exports = {
    setElectionTime,
    getElectionTime,
    deleteElectionTime
};