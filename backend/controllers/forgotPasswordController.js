require('dotenv').config();
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const db = require('../config/db');


// Generate a secure reset token
const generateResetToken = () => crypto.randomBytes(32).toString('hex');

// Normalize email (handle Gmail suffixes)
const cleanEmail = (email) => {
    if (!email) return email;
    const match = email.match(/^([^@]+)@(gmail\.com)(-.*)?$/i);
    return match ? `${match[1].split('-')[0]}@gmail.com` : email;
};

// Send reset email
const sendResetEmail = async (email, token, ID) => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: 'timalsinadipendra125@gmail.com',
pass: process.env.email,
        },
    });

    const resetLink = `${process.env.BASE_URL}/reset-password?token=${encodeURIComponent(token)}&ID=${encodeURIComponent(ID)}`;

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Password Reset Request",
        html: `
            <p>Hello,</p>
            <p>You requested a password reset.</p>
            <p>Click the link below to reset your password:</p>
            <a href="${resetLink}">Reset Password</a>
            <p>This link will expire in 30 minutes.</p>
            <p>Your ID: ${ID}</p>
            <p>If you didn't request this, please ignore this email.</p>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error("Error sending email:", error);
        throw new Error('Error sending email');
    }
};

// Forgot password function
const forgotPassword = async (req, res) => {
    const { ID } = req.body;
    if (!ID) return res.status(400).json({ success: false, message: "ID is required." });

    let connection;
    try {
        connection = await db.getConnection();

        let userFound = false, userEmail = '', table = '', idColumn = '';
        let query, params;

        // If the ID starts with 'V' or 'A', check the respective table (voters or admins)
        if (ID[0].toUpperCase() === 'V' || ID[0].toUpperCase() === 'A') {
            const firstLetter = ID[0].toUpperCase();
            const tablesToCheck = firstLetter === 'V'
                ? [{ table: 'voters', idColumn: 'voterID' }, { table: 'admins', idColumn: 'adminID' }]
                : [{ table: 'admins', idColumn: 'adminID' }, { table: 'voters', idColumn: 'voterID' }];
            
            for (const tableInfo of tablesToCheck) {
                [users] = await connection.execute(
                    `SELECT email FROM ${tableInfo.table} WHERE ${tableInfo.idColumn} = ?`, 
                    [ID]
                );
                if (users.length > 0) {
                    userFound = true;
                    userEmail = users[0].email;
                    table = tableInfo.table;
                    idColumn = tableInfo.idColumn;
                    break;
                }
            }
        } 
        // If the ID starts with a number, check 'nid' column in both admins and voters tables
        else if (!isNaN(ID[0])) {
            const tablesToCheck = [
                { table: 'voters', nidColumn: 'nid' },
                { table: 'admins', nidColumn: 'nid' }
            ];

            for (const tableInfo of tablesToCheck) {
                query = `SELECT email FROM ${tableInfo.table} WHERE ${tableInfo.nidColumn} = ?`;
                params = [ID];
                const [users] = await connection.execute(query, params);
                
                if (users.length > 0) {
                    userFound = true;
                    userEmail = users[0].email;
                    table = tableInfo.table;
                    idColumn = tableInfo.nidColumn;
                    break;
                }
            }
        }

        if (!userFound) return res.status(404).json({ success: false, message: "User not found!" });

        const normalizedEmail = cleanEmail(userEmail);
        const resetToken = generateResetToken();
        const resetTokenExpiry = new Date();
        resetTokenExpiry.setMinutes(resetTokenExpiry.getMinutes() + 30);

        await connection.execute(
            `UPDATE ${table} SET resetToken = ?, resetTokenExpiry = ? WHERE ${idColumn} = ?`,
            [resetToken, resetTokenExpiry, ID]
        );

        await sendResetEmail(normalizedEmail, resetToken, ID);

        res.status(200).json({ success: true, message: "Password reset token has been sent to your email." });

    } catch (error) {
        console.error("Error in forgot-password:", error);
        res.status(500).json({ success: false, message: "Server error. Please try again later." });
    } finally {
        if (connection) connection.release();
    }
};


module.exports = forgotPassword;
