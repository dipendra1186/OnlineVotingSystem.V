const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Database connection
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

// Login Customer
const loginCustomer = async (req, res) => {
    try {
        const { voterID, password } = req.body;
        if (!voterID || !password) return res.status(400).json({ message: 'Voter ID and password are required' });

        // Fetch user from database
        const [rows] = await db.execute("SELECT password FROM users WHERE voterID = ?", [voterID]);
        if (rows.length === 0) return res.status(400).json({ message: 'Invalid credentials' });

        const hashedPassword = rows[0].password;

        // Compare password
        const isMatch = await bcrypt.compare(password, hashedPassword);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        res.status(200).json({ success: true, message: 'Login successful' });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = loginCustomer;
