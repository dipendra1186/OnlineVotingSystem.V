require("dotenv").config();
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
const db = require("../config/db");

const loginCustomer = async (req, res) => {
    try {
        const { voterID, password } = req.body;

        // Validate input fields
        if (!voterID || !password) {
            return res.status(400).json({ success: false, message: "Voter ID and password are required." });
        }

        // Determine user role based on voterID prefix
        const firstLetter = voterID.charAt(0).toUpperCase();
        let table, idColumn;

        if (firstLetter === "A") {
            table = "admins";
            idColumn = "adminID";
        } else if (firstLetter === "V") {
            table = "voters";
            idColumn = "voterID";
        } else {
            return res.status(400).json({ success: false, message: "Invalid Voter ID format. Must start with 'A' or 'V'." });
        }

        // Build the SELECT query based on the table
        let query = `SELECT ${idColumn} AS userID, password, fullName, email`;
        if (table === "voters") {
            query += `, status`; // Only add status for voters
        }
        query += ` FROM ${table} WHERE ${idColumn} = ?`;

        // Execute the query
        const [rows] = await db.execute(query, [voterID]);

        // If no user found, return error
        if (rows.length === 0) {
            return res.status(400).json({ success: false, message: "Invalid credentials." });
        }

        const user = rows[0];
        console.log("Fetched user data:", user); // Debug log

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Invalid credentials." });
        }

        // Successful login response
        const userData = {
            userID: user.userID,
            name: user.fullName,
            email: user.email,
            role: firstLetter === "A" ? "Admin" : "Voter",
        };

        if (user.status !== undefined) {
            userData.status = user.status; // Only include status if it exists
        }

        res.status(200).json({
            success: true,
            message: "Login successful.",
            user: userData,
        });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

module.exports = loginCustomer;
