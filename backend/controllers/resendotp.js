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
        const { userID } = req.body;
        const voterID = userID;

        if (!voterID) return res.status(400).json({ message: 'Voter ID is required' });

        // Fetch user record
        const [rows] = await db.execute("SELECT * FROM voters WHERE voterID = ?", [voterID]);
        if (rows.length === 0) return res.status(400).json({ message: 'User not found' });

        const user = rows[0];
        const storedEmail = user.email;

        // Extract original email part (before the suffix)
        const hasEmailSuffix = storedEmail.includes('@') &&
            ((storedEmail.split('@')[1].includes('-')) ||
                (storedEmail.includes('-') && storedEmail.indexOf('-') > storedEmail.indexOf('@')));

        let originalEmail;

        if (hasEmailSuffix) {
            if (storedEmail.split('@')[1].includes('-')) {
                // Format: username@domain-initials.com
                const parts = storedEmail.split('@');
                const domainParts = parts[1].split('-');
                originalEmail = parts[0] + '@' + domainParts[0];
            } else {
                // Format: username@domain.com-initials
                originalEmail = storedEmail.substring(0, storedEmail.lastIndexOf('-'));
            }
        } else {
            originalEmail = storedEmail;
        }

        // Generate new OTP
        const newOTP = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date();
        otpExpiry.setMinutes(otpExpiry.getMinutes() + 10);

        // Update OTP in database
        await db.execute("UPDATE voters SET otp = ?, otpExpiry = ? WHERE voterID = ?", [newOTP, otpExpiry, voterID]);

        // Send OTP email
        await sendOTP(originalEmail, newOTP);
        res.status(200).json({ success: true, message: 'New OTP sent successfully. Please check your email.' });

    } catch (error) {
        console.error('Error in OTP Resend:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Helper function to send OTP email
const sendOTP = async (email, otp) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'timalsinadipendra125@gmail.com',
            pass: process.env.email,
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
