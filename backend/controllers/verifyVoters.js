const db = require('../config/db');
const nodemailer = require('nodemailer');

// GET: Fetch voters pending verification
exports.getPendingVoters = async (req, res) => {
    try {
        const [voters] = await db.query("SELECT * FROM voters WHERE status IN ('Pending', 'Rejected')");
        res.json(voters);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Failed to fetch pending voters", error: err });
    }
};

// PUT: Verify a voter
exports.verifyVoter = async (req, res) => {
    const voterID = req.params.voterID;

    try {
        // Update status only (remove isVerified logic)
        const [result] = await db.query(
            `UPDATE voters 
             SET 
               status = 'Verified',
               rejected_at = NULL,
               otp_failed_attempts = 0,
               otp_block_until = 0,
               otp_verification_status = 'active',
               otp_failed_attempts_phase2 = 0
             WHERE voterID = ?`,
            [voterID]
          );
          

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Voter not found" });
        }

        const [voterInfo] = await db.query('SELECT email, fullName FROM voters WHERE voterID = ?', [voterID]);

        if (!voterInfo.length) {
            return res.status(404).json({ success: false, message: "Email info not found" });
        }

        let email = voterInfo[0].email;
        const fullName = voterInfo[0].fullName;

        if (email) {
            email = email.split('-')[0];
        }

        if (email && fullName) {
            await sendVerificationEmail(email, fullName);
        }

        res.json({ success: true, message: `Voter ${voterID} verified and notified.` });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Verification failed", error: err });
    }
};

// Send voter verification email
async function sendVerificationEmail(email, fullName) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'timalsinadipendra125@gmail.com',
            pass: process.env.email,
        }
    });

    const mailOptions = {
        from: '"Election Commission Nepal" <timalsinadipendra125@gmail.com>',
        to: email,
        subject: 'Voter Verification Successful',
        html: `
            <h3>Dear ${fullName},</h3>
            <p>Your voter registration has been <b>verified</b> successfully.</p>
            <p>You are now officially eligible to vote in upcoming elections.</p>
            <br>
            <p>Best Regards,<br>Election Commission Nepal</p>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Verification email sent to ${email}`);
    } catch (err) {
        console.error("❌ Error sending email:", err);
        throw new Error("Failed to send verification email.");
    }
}

// PUT: Reject a voter
exports.rejectVoter = async (req, res) => {
    const voterID = req.params.voterID;

    try {
        const [result] = await db.query(
            `UPDATE voters SET status = 'Rejected' WHERE voterID = ?`,
            [voterID]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Voter not found" });
        }

        const [voterInfo] = await db.query('SELECT email, fullName FROM voters WHERE voterID = ?', [voterID]);

        if (!voterInfo.length) {
            return res.status(404).json({ success: false, message: "Email info not found" });
        }

        let email = voterInfo[0].email;
        const fullName = voterInfo[0].fullName;

        if (email) {
            email = email.split('-')[0];
        }

        if (email && fullName) {
            await sendRejectionEmail(email, fullName);
        }

        res.json({ success: true, message: `Voter ${voterID} rejected and notified.` });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Rejection failed", error: err });
    }
};

// Send voter rejection email
async function sendRejectionEmail(email, fullName) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'timalsinadipendra125@gmail.com',
            pass: process.env.email,
        }
    });

    const mailOptions = {
        from: '"Election Commission Nepal" <timalsinadipendra125@gmail.com>',
        to: email,
        subject: 'Voter Registration Rejected',
        html: `
            <h3>Dear ${fullName},</h3>
            <p>We regret to inform you that your voter registration has been <b>rejected</b>.</p>
            <p>Please contact your local election office for clarification or resubmission.</p>
            <br>
            <p>Best Regards,<br>Election Commission Nepal</p>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`❌ Rejection email sent to ${email}`);
    } catch (err) {
        console.error("❌ Error sending rejection email:", err);
        throw new Error("Failed to send rejection email.");
    }
}
