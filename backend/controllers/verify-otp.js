const db = require('../config/db');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: 'gtfc mlza rgzr vlwx', // Consider moving to env variable for security
    },
    tls: {
        rejectUnauthorized: false
    }
});

const PHASE1_MAX_ATTEMPTS = 5;
const PHASE2_MAX_ATTEMPTS = 3;
const BLOCK_DURATION_MINUTES = 1; // Use 30 in production

const verifyOTP = async (req, res) => {
    try {
        const { userID, email, otp } = req.body;

        if (!userID || !email || !otp) {
            return res.status(400).json({ message: 'User ID, Email, and OTP are required.' });
        }

        const [rows] = await db.query("SELECT * FROM voters WHERE voterID = ?", [userID]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Voter not found.' });
        }

        const voter = rows[0];
        const now = new Date();

        if (voter.otp_verification_status === 'rejected') {
            return res.status(403).json({ message: 'Your account has been permanently rejected. Visit the office to verify.' });
        }

        const storedEmail = voter.email;
        const originalEmail = storedEmail.includes('-') ? 
            `${storedEmail.split('@')[0]}@${storedEmail.split('@')[1].split('-')[0]}` : storedEmail;

        if (originalEmail !== email) {
            return res.status(400).json({ message: 'Email does not match the registered voter.' });
        }

        // Handle block expiry
        if (voter.otp_block_until && new Date(voter.otp_block_until) > now) {
            return res.status(403).json({
                message: `Temporarily blocked due to failed OTP attempts. Try again after ${new Date(voter.otp_block_until).toLocaleTimeString()}.`
            });
        }

        // Get attempts from separate columns
        const phase1Attempts = voter.otp_failed_attempts || 0;
        const phase2Attempts = voter.otp_failed_attempts_phase2 || 0;

        // If block expired and entering phase 2
        if (voter.otp_block_until && new Date(voter.otp_block_until) <= now && phase1Attempts >= PHASE1_MAX_ATTEMPTS) {
            await db.query(`
                UPDATE voters SET otp_verification_status = 'active', otp_block_until = NULL
                WHERE voterID = ?
            `, [userID]);
        }

        // OTP mismatch
        if (voter.otp !== otp) {
            let message;
            if (phase1Attempts < PHASE1_MAX_ATTEMPTS) {
                // Phase 1
                const newPhase1Attempts = phase1Attempts + 1;
                message = `Incorrect OTP. ${PHASE1_MAX_ATTEMPTS - newPhase1Attempts} attempts left before temporary block.`;

                if (newPhase1Attempts === PHASE1_MAX_ATTEMPTS) {
                    const blockUntil = new Date(now.getTime() + BLOCK_DURATION_MINUTES * 60000);
                    await db.query(`
                        UPDATE voters
                        SET otp_block_until = ?, 
                            otp_verification_status = 'blocked', 
                            otp_failed_attempts = ?
                        WHERE voterID = ?
                    `, [blockUntil, newPhase1Attempts, userID]);

                    await transporter.sendMail({
                        from: process.env.EMAIL_USER,
                        to: originalEmail,
                        subject: '🔒 OTP Block Notice - Verification Required',
                        text: `You have exceeded 5 incorrect OTP attempts.\n\nYour account is temporarily blocked for ${BLOCK_DURATION_MINUTES} minute.\n\nWe have sent a new OTP. Please try again carefully.\n\nVoter ID: ${userID}`
                    });

                    return res.status(403).json({ message: `You are temporarily blocked for ${BLOCK_DURATION_MINUTES} minute.` });
                } else {
                    // Update only phase 1 attempts
                    await db.query(`
                        UPDATE voters
                        SET otp_failed_attempts = ?
                        WHERE voterID = ?
                    `, [newPhase1Attempts, userID]);
                }
            } else {
                // Phase 2
                const newPhase2Attempts = phase2Attempts + 1;
                if (newPhase2Attempts === PHASE2_MAX_ATTEMPTS) {
                    await db.query(`
                        UPDATE voters
                        SET otp_verification_status = 'rejected', 
                            rejected_at = ?, 
                            otp_failed_attempts_phase2 = ?
                        WHERE voterID = ?
                    `, [now, newPhase2Attempts, userID]);

                    await transporter.sendMail({
                        from: process.env.EMAIL_USER,
                        to: originalEmail,
                        subject: '❌ OTP Rejected - Final Notice',
                        text: `You have used all OTP verification attempts.\n\nYour account is permanently rejected.\n\nPlease visit the office to verify and restore access.\n\nVoter ID: ${userID}`
                    });

                    return res.status(403).json({ message: 'Final OTP attempt failed. Your account has been permanently rejected.' });
                }

                if (newPhase2Attempts === PHASE2_MAX_ATTEMPTS - 1) {
                    await transporter.sendMail({
                        from: process.env.EMAIL_USER,
                        to: originalEmail,
                        subject: '⚠️ Final OTP Attempt',
                        text: `You are on your final OTP attempt. After this, your account will be permanently rejected.\n\nVoter ID: ${userID}`
                    });
                }

                message = `Incorrect OTP. You have ${PHASE2_MAX_ATTEMPTS - newPhase2Attempts} final attempts left.`;
                
                // Update only phase 2 attempts
                await db.query(`
                    UPDATE voters
                    SET otp_failed_attempts_phase2 = ?
                    WHERE voterID = ?
                `, [newPhase2Attempts, userID]);
            }

            return res.status(403).json({ message });
        }

        // OTP matched
        await db.query(`
            UPDATE voters
            SET otp_verification_status = 'active',
                otp_block_until = NULL,
                otp_failed_attempts = 0,
                otp_failed_attempts_phase2 = 0,
                rejected_at = NULL
            WHERE voterID = ?
        `, [userID]);

        console.log(`✅ OTP verified for voterID: ${userID}`);
        return res.status(200).json({
            success: true,
            message: 'OTP verified successfully.',
            id: userID
        });

    } catch (err) {
        console.error('❌ Error during OTP verification:', err);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

module.exports = {
    verifyOTP
};