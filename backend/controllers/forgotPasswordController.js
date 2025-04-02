require('dotenv').config();
const mysql = require('mysql2/promise');
const nodemailer = require("nodemailer");
const crypto = require("crypto");  // Using crypto for secure token generation

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

// Generate secure reset token using crypto
const generateResetToken = () => {
    return crypto.randomBytes(32).toString('hex');  // Secure random token
};

// Helper function to send reset token via email
const sendResetEmail = async (email, token, voterID) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',  // Or use another email provider
        auth: {
            user: 'timalsinadipendra125@gmail.com',
            pass: 'gtfc mlza rgzr vlwx',  // Use an environment variable for the password
        },
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,  // Sender's email address from .env
        to: email,
        subject: 'Password Reset Request',
        html: `
            <p>Click the following link to reset your password:</p>
            <a href="http://localhost:3000/reset-password?token=${token}&voterID=${voterID}">Reset Password</a>
            <p>This link will expire in 30 minutes.</p>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (emailError) {
        console.error("Error sending email:", emailError);
        throw new Error('Error sending email');
    }
};


// Forgot password function
const forgotPassword = async (req, res) => {
    const { voterID } = req.body;

    try {
        // Connect to the database
        const connection = await connectDB();

        // Find user by voterID
        const [users] = await connection.execute('SELECT * FROM users WHERE voterID = ?', [voterID]);

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: "User not found!" });
        }

        const user = users[0];  // Assuming the first user is the one we're looking for

        // Generate a secure reset token
        const resetToken = generateResetToken();

        // Update user's reset token and expiration time in the database
        const resetTokenExpiry = new Date();
        resetTokenExpiry.setMinutes(resetTokenExpiry.getMinutes() + 30);  // Token expires in 30 minutes

        await connection.execute('UPDATE users SET resetToken = ?, resetTokenExpiry = ? WHERE voterID = ?', [resetToken, resetTokenExpiry, voterID]);

        // Send the reset token to the user's email
        await sendResetEmail(user.email, resetToken);

        res.status(200).json({ success: true, message: "Password reset token has been sent to your email." });

    } catch (error) {
        console.error("Error in forgot-password:", error);
        res.status(500).json({ success: false, message: "Server error. Please try again later." });
    }
};

module.exports = forgotPassword;
