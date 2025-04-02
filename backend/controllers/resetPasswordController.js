require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');  // Import bcrypt for password hashing

// Database connection function
const connectDB = async () => {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });
        console.log("Connected to the database.");
        return connection;
    } catch (error) {
        console.error("Database connection failed:", error);
        throw new Error('Database connection error');
    }
};

// Reset password handler
const resetPassword = async (req, res) => {
    const { token, password, confirmPassword, voterID } = req.body;

    if (password !== confirmPassword) {
        return res.status(400).json({ success: false, message: "Passwords do not match." });
    }

    try {
        const connection = await connectDB();

        // Find user by voterID and reset token
        const [users] = await connection.execute('SELECT * FROM users WHERE voterID = ? AND resetToken = ?', [voterID, token]);
        if (users.length === 0) {
            return res.status(400).json({ success: false, message: "Invalid or expired token for this voterID." });
        }

        const user = users[0];
        const resetTokenExpiry = new Date(user.resetTokenExpiry);
        if (resetTokenExpiry < new Date()) {
            return res.status(400).json({ success: false, message: "Token has expired." });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(password, 10);  // bcrypt hashes the password

        // Update the password in the database
        await connection.execute('UPDATE users SET password = ?, resetToken = NULL, resetTokenExpiry = NULL WHERE voterID = ?', [hashedPassword, voterID]);

        res.status(200).json({ success: true, message: "Password has been reset successfully." });
    } catch (error) {
        console.error("Error in reset-password:", error);
        res.status(500).json({ success: false, message: "Server error. Please try again later." });
    }
};

module.exports = resetPassword;
