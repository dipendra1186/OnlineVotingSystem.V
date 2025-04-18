const db = require('../config/db');
const nodemailer = require('nodemailer');

// GET: Fetch unverified voters
exports.getPendingVoters = async (req, res) => {
    try {
        const [voters] = await db.query('SELECT * FROM voters WHERE isVerified = 0');
        res.json(voters); // frontend expects an array directly
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Failed to fetch pending voters", error: err });
    }
};

// PUT: Verify a voter
exports.verifyVoter = async (req, res) => {
    const voterID = req.params.voterID;

    try {
        const [result] = await db.query('UPDATE voters SET isVerified = 1 WHERE voterID = ?', [voterID]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Voter not found" });
        }

        const [voterInfo] = await db.query('SELECT email, fullName FROM voters WHERE voterID = ?', [voterID]);
        let email = voterInfo[0]?.email;
        const fullName = voterInfo[0]?.fullName;

        // Extract the part before the hyphen in the email (if it exists)
        if (email) {
            email = email.split('-')[0]; // Keep only the part before the hyphen
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


// Send verification email
async function sendVerificationEmail(email, fullName) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'timalsinadipendra125@gmail.com',
            pass: 'gtfc mlza rgzr vlwx',
        }
    });

    const mailOptions = {
        from: '"Election Commission Nepal" <timalsinadipendra125@gmail.com>',
        to: email,
        subject: 'Voter Verification Completed',
        html: `
            <h3>Dear ${fullName},</h3>
            <p>Your account has been successfully <b>verified</b>.</p>
            <p>You are now eligible to vote.</p>
            <br>
            <p>Regards,<br>Election Commission Nepal</p>
        `
    };

    await transporter.sendMail(mailOptions);
}
