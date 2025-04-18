require("dotenv").config();
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");

// Database connection
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
});

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

        // Fetch user details from database
        const [rows] = await db.execute(
            `SELECT ${idColumn} AS userID, password, fullName, email FROM ${table} WHERE ${idColumn} = ?`,
            [voterID]
        );

        // If no user found, return error
        if (rows.length === 0) {
            return res.status(400).json({ success: false, message: "Invalid credentials." });
        }

        const user = rows[0];


        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Invalid credentials." });
        }

        // Successful login response
        res.status(200).json({
            success: true,
            message: "Login successful.",
            user: {
                userID: user.userID,
                name: user.fullName,
                email: user.email,
                role: firstLetter === "A" ? "Admin" : "Voter",
            },
        });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

module.exports = loginCustomer;
