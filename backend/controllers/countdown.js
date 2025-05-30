// controllers/countdown.js
const pool = require("../config/db.js");


// Set election start and end time
const setElectionTime = async (req, res) => {
    try {
        const { adminID, startTime, endTime, name, description } = req.body;

        if (!adminID || !startTime || !endTime || !name) {
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
                "UPDATE election_times SET start_time = ?, end_time = ?, name = ?, description = ? WHERE admin_id = ?",
                [startTime, endTime, name, description, adminID]
            );
            return res.status(200).json({ message: "Election time updated successfully" });
        } else {
            // Insert new record
            await pool.query(
                "INSERT INTO election_times (admin_id, start_time, end_time, name, description) VALUES (?, ?, ?, ?, ?)",
                [adminID, startTime, endTime, name, description]
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
            "SELECT start_time, end_time, name, description, status FROM election_times WHERE admin_id = ?",
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
            endTime: result[0].end_time,
            name: result[0].name,
            description: result[0].description,
            status: result[0].status
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
        const [electionRows] = await pool.query('SELECT * FROM election_times');

        if (!electionRows || electionRows.length === 0) {
            console.warn('⚠️ No election time found in database.');
            return;
        }

        const currentTime = new Date();

        for (const election of electionRows) {
            const { id, end_time, start_time, status } = election;

            const electionEndTime = new Date(end_time);
            const electionStartTime = new Date(start_time);

            let newStatus = status;

            if (currentTime < electionStartTime) {
                newStatus = 'upcoming';
            } else if (currentTime >= electionStartTime && currentTime < electionEndTime) {
                newStatus = 'ongoing';
            } else if (currentTime >= electionEndTime) {
                newStatus = 'ended';
            }

            if (newStatus !== status) {
                await pool.query(
                    'UPDATE election_times SET status = ?, updated_at = NOW() WHERE id = ?',
                    [newStatus, id]
                );
                console.log(`✅ Election ID ${id} status updated to: ${newStatus}`);
            }
        }
    } catch (err) {
        if (err.code === 'ECONNREFUSED') {
            console.error('❌ Database connection refused. Skipping this check.');
        } else {
            console.error('🚨 Unexpected error updating election status:', err.message || err);
        }
    }
};


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

const startElectionStatusUpdater = async () => {
    try {
        await pool.query('SELECT 1');
        console.log('✅ Database connected. Starting election status updater...');
        setInterval(updateElectionStatus, 1000);
    } catch (err) {
        console.error('❌ Cannot start updater. Database connection failed:', err.message);
    }
};

startElectionStatusUpdater();


setInterval(updateElectionStatus, 1000); // every second

module.exports = {
    countdownController,
    setElectionTime,
    getElectionTime,
    deleteElectionTime
};