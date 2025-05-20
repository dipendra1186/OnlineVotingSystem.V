const db = require('../config/db');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: 'gtfc mlza rgzr vlwx',
    }
});

const MAX_ATTEMPTS = 5;
const BLOCK_DURATION_MINUTES = 30;

const verifyOTP = async (req, res) => {
    try {
        const { userID, email, otp } = req.body;

        if (!userID || !email || !otp) {
            return res.status(400).json({ message: 'User ID, Email, and OTP are required' });
        }

        let user = null;
        let table = '';
        let idColumn = '';

        // Check VOTERS
        const [voterRows] = await db.query("SELECT * FROM voters WHERE voterID = ?", [userID]);
        if (voterRows.length > 0) {
            user = voterRows[0];
            table = 'voters';
            idColumn = 'voterID';
        }

        // Check ADMINS
        if (!user) {
            const [adminRows] = await db.query("SELECT * FROM admins WHERE adminID = ?", [userID]);
            if (adminRows.length > 0) {
                user = adminRows[0];
                table = 'admins';
                idColumn = 'adminID';
            }
        }

        if (!user) {
            return res.status(400).json({ message: 'Invalid User ID' });
        }

        // Check if user is blocked
        if (user.otp_block_until && new Date(user.otp_block_until) > new Date()) {
            return res.status(403).json({ message: 'Account is temporarily blocked due to multiple failed OTP attempts. Try again later.' });
        }

        // Parse email suffix
        const storedEmail = user.email;
        const hasEmailSuffix = storedEmail.includes('@') && 
            ((storedEmail.split('@')[1].includes('-')) || 
             (storedEmail.includes('-') && storedEmail.indexOf('-') > storedEmail.indexOf('@')));

        let originalEmail;
        if (hasEmailSuffix) {
            if (storedEmail.split('@')[1].includes('-')) {
                const parts = storedEmail.split('@');
                const domainParts = parts[1].split('-');
                originalEmail = parts[0] + '@' + domainParts[0];
            } else {
                originalEmail = storedEmail.substring(0, storedEmail.lastIndexOf('-'));
            }
        } else {
            originalEmail = storedEmail;
        }

        if (originalEmail !== email) {
            return res.status(400).json({ message: 'Email does not match with User ID' });
        }

        // Check OTP
        if (user.otp !== otp) {
            let attempts = (user.otp_failed_attempts || 0) + 1;
            const now = new Date();

            if (attempts >= MAX_ATTEMPTS) {
                const blockUntil = new Date(now.getTime() + BLOCK_DURATION_MINUTES * 60000);
                let newStatus = 'blocked';

                // Check for second-time block
                if (user.otp_verification_status === 'blocked') {
                    newStatus = 'rejected';
                }

                await db.query(`UPDATE ${table} SET otp_failed_attempts = ?, otp_block_until = ?, otp_verification_status = ? WHERE ${idColumn} = ?`, [
                    attempts, blockUntil, newStatus, userID
                ]);

                // Email alert
                await transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: originalEmail,
                    subject: `⚠️ OTP Verification Blocked for ${table}`,
                    text: `Your account (${userID}) is temporarily blocked due to 5 incorrect OTP attempts. Please wait 30 minutes or contact support.`
                });

                return res.status(403).json({ message: 'Too many failed attempts. Account blocked for 30 minutes.' });
            } else {
                await db.query(`UPDATE ${table} SET otp_failed_attempts = ? WHERE ${idColumn} = ?`, [attempts, userID]);
                return res.status(400).json({ message: `Invalid OTP. Attempt ${attempts}/${MAX_ATTEMPTS}` });
            }
        }

        // Successful OTP verification
        await db.query(`UPDATE ${table} SET otp_failed_attempts = 0, otp_block_until = NULL, otp_verification_status = 'active' WHERE ${idColumn} = ?`, [userID]);

        console.log("✅ OTP verified successfully for", table, "UserID:", userID);
        res.status(200).json({ success: true, message: 'OTP verified successfully.', id: userID });

    } catch (error) {
        console.error('❌ Error in OTP verification:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = verifyOTP;
