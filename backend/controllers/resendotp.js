const mysql = require('mysql2/promise');
const nodemailer = require('nodemailer');
require('dotenv').config();


// Database connection
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

// Resend OTP function
const resendOTP = async (req, res) => {
    try {
        const { voterID } = req.body;
        if (!voterID) return res.status(400).json({ message: 'Voter ID is required' });

        // Fetch user from database
        const [rows] = await db.execute("SELECT email FROM users WHERE voterID = ?", [voterID]);
        if (rows.length === 0) return res.status(400).json({ message: 'User not found' });

        const email = rows[0].email;

        // Generate new OTP
        const newOTP = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date();
        otpExpiry.setMinutes(otpExpiry.getMinutes() + 10);

        // Update OTP in database
        await db.execute("UPDATE users SET otp = ?, otpExpiry = ? WHERE voterID = ?", [newOTP, otpExpiry, voterID]);

        // Send OTP email
        await sendOTP(email, newOTP);
        res.status(200).json({ message: 'New OTP sent successfully. Please check your email.' });

    } catch (error) {
        console.error('Error in OTP Resend:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Helper function to send OTP email
const sendOTP = async (email, otp) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'timalsinadipendra125@gmail.com',
            pass: 'gtfc mlza rgzr vlwx',
        },
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'OTP for Your Registration',
        text: `Your OTP is: ${otp}`
    };

    await transporter.sendMail(mailOptions);
};

module.exports = resendOTP;
