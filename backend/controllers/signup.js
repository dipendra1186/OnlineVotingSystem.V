require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

// DB Connection
async function connectDB() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    });
    console.log("✅ Connected to DB");
    return connection;
}

// Generate unique ID
async function generateUniqueID(role, fullName, connection) {
    const prefix = role === "Admin" ? "A" : "V";
    const year = new Date().getFullYear();
    let uniqueID, exists;

    do {
        const [firstInitial, lastInitial] = fullName.trim().split(' ').map(n => n.charAt(0).toUpperCase());
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        uniqueID = `${prefix}${year}${firstInitial || "X"}${lastInitial || "X"}${randomNum}`;

        const table = role === "Admin" ? "admins" : "voters";
        const idCol = role === "Admin" ? "adminID" : "voterID";

        const [rows] = await connection.execute(`SELECT 1 FROM ${table} WHERE ${idCol} = ?`, [uniqueID]);
        exists = rows.length > 0;
    } while (exists);

    return uniqueID;
}

// Main registration
const createCustomer = async (req, res) => {
    try {
        const { fullName, age, gender, email, nid, password, role, photo } = req.body;

        // Basic validation
        if (!fullName || !age || !gender || !email || !password || !role || !photo || !nid) {
            return res.status(400).json({ message: 'All fields including photo and NID are required.' });
        }

        if (!['Voter', 'Admin'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role. Only Voter or Admin allowed.' });
        }

        const ageNum = parseInt(age);
        if (isNaN(ageNum) || ageNum < 18) {
            return res.status(400).json({ message: 'You must be at least 18 years old to register.' });
        }

        const connection = await connectDB();

        // Normalize email
        const [firstName, lastName] = fullName.trim().split(' ');
        const modifiedEmail = `${email.trim().toLowerCase()}-${(firstName[0] || 'x').toLowerCase()}${(lastName?.[0] || 'x').toLowerCase()}`;

        const table = role === "Admin" ? "admins" : "voters";

        const [existingEmail] = await connection.execute(
            `SELECT 1 FROM ${table} WHERE email = ?`,
            [modifiedEmail]
        );
        if (existingEmail.length > 0) {
            return res.status(400).json({ message: 'Email already exists. Try logging in or use a different one.' });
        }

        // Password strength validation
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;

        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                message: 'Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one digit, and one special character (!@#$%^&*).'
            });
        }


        // NID checks (for Voters)
        if (role === "Voter") {
            const [nidCheck] = await connection.execute(
                `SELECT status FROM voters WHERE nid = ?`,
                [nid]
            );
            if (nidCheck.length > 0) {
                const existing = nidCheck[0].status;
                if (['Verified', 'Pending'].includes(existing)) {
                    return res.status(400).json({
                        message: `This NID is already ${existing}. Re-registration is not allowed.`
                    });
                }
            }
        }

        const userID = await generateUniqueID(role, fullName, connection);
        const hashedPassword = await bcrypt.hash(password, 10);
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 10 * 60000); // 10 min from now

        // Insert
        const insertQuery = role === "Admin"
            ? `INSERT INTO admins (fullName, age, gender, email, password, adminID, otp, otpExpiry, photo, nid) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            : `INSERT INTO voters (fullName, age, gender, email, password, voterID, otp, otpExpiry, photo, nid, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`;

        const insertParams = role === "Admin"
            ? [fullName, ageNum, gender, modifiedEmail, hashedPassword, userID, otp, otpExpiry, photo, nid]
            : [fullName, ageNum, gender, modifiedEmail, hashedPassword, userID, otp, otpExpiry, photo, nid];

        await connection.execute(insertQuery, insertParams);
        console.log(`✅ New ${role} registered with ID: ${userID}`);

        await sendOTP(email, otp, userID, role, photo);

        res.status(200).json({
            success: true,
            message: `User registered successfully as ${role}. Check your email for your ${role === "Admin" ? "Admin ID" : "Voter ID"}.`,
            userID
        });

    } catch (error) {
        console.error("❌ Error in createCustomer:", error);
        res.status(500).json({ success: false, message: 'Registration failed.', error: error.message });
    }
};

// OTP Sender
const sendOTP = async (email, otp, userID, role, photo) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.email,
            }
        });

        const mailOptions = {
            from: `"Election Commission" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Your Registration Details',
            html: `
                <h3>Welcome to the Online Voting System!</h3>
                <p><strong>OTP:</strong> ${otp}</p>
                <p><strong>${role} ID:</strong> ${userID}</p>
                <img src="${photo}" alt="User Photo" width="150" style="border-radius: 10px;" />
                ${role === "Voter" ? "<p>Your registration is under verification. You will be notified once approved.</p>" : ""}
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ OTP email sent to ${email}`);
    } catch (error) {
        console.error("❌ Failed to send OTP:", error);
        throw new Error("Failed to send OTP email.");
    }
};

module.exports = createCustomer;
