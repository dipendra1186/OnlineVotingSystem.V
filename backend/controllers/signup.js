require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

// Database connection
async function connectDB() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    });
    console.log("✅ Connected to the database in signup");
    return connection;
}

// Generate unique Admin or Voter ID
async function generateUniqueID(role, fullName, connection) {
    const prefix = role === "Admin" ? "A" : "V";
    const currentYear = new Date().getFullYear();
    let uniqueID;
    let exists;

    do {
        const nameParts = fullName.trim().split(' ');
        const firstInitial = nameParts[0]?.charAt(0).toUpperCase() || "X";
        const lastInitial = nameParts[nameParts.length - 1]?.charAt(0).toUpperCase() || "X";
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        uniqueID = `${prefix}${currentYear}${firstInitial}${lastInitial}${randomNum}`;

        const [rows] = await connection.execute(
            `SELECT * FROM ${role === "Admin" ? "admins" : "voters"} WHERE ${role === "Admin" ? "adminID" : "voterID"} = ?`,
            [uniqueID]
        );

        exists = rows.length > 0;
    } while (exists);

    return uniqueID;
}

// Main signup function
const createCustomer = async (req, res) => {
    try {
        const { fullName, age, gender, email, nid, password, role, photo } = req.body;

        if (!fullName || !age || !gender || !email || !password || !role || !photo || !nid) {
            return res.status(400).json({ message: 'All fields including photo and NID are required' });
        }

        const ageNum = parseInt(age);
        if (isNaN(ageNum) || ageNum < 18) {
            return res.status(400).json({ message: 'Age must be 18 or above' });
        }

        const connection = await connectDB();

        const nameParts = fullName.trim().split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts[nameParts.length - 1];
        const modifiedEmail = `${email}-${firstName.charAt(0).toLowerCase()}${lastName.charAt(0).toLowerCase()}`;

        // Check for existing email
        const [existingUser] = await connection.execute(
            `SELECT * FROM ${role === "Admin" ? "admins" : "voters"} WHERE email = ?`,
            [modifiedEmail]
        );
        if (existingUser.length > 0) {
            return res.status(400).json({ message: 'Email already exists' });
        }

        // NID Check for Voters only
        let finalNID = nid;

        if (role === "Voter") {
            const [nidResults] = await connection.execute(
                `SELECT nid, status FROM voters WHERE nid = ?`,
                [nid]
            );

            if (nidResults.length > 0) {
                const found = nidResults[0];

                if (found.status === "Verified") {
                    return res.status(400).json({ message: 'This NID is already verified and cannot be reused.' });
                }

                if (found.status === "Pending") {
                    return res.status(400).json({ message: 'This NID is already under verification. Please wait for review.' });
                }

                if (found.status === "Rejected") {
                    console.log(`⚠️ Previous registration with NID ${nid} was rejected. Allowing new entry.`);
                }
            }
        }

        const userID = await generateUniqueID(role, fullName, connection);
        const hashedPassword = await bcrypt.hash(password, 10);
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date();
        otpExpiry.setMinutes(otpExpiry.getMinutes() + 10);

        // Insert into DB
        const insertQuery = role === "Admin"
            ? `INSERT INTO admins (fullName, age, gender, email, password, adminID, otp, otpExpiry, photo, nid) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            : `INSERT INTO voters (fullName, age, gender, email, password, voterID, otp, otpExpiry, photo, nid, isVerified, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const insertParams = role === "Admin"
            ? [fullName, ageNum, gender, modifiedEmail, hashedPassword, userID, otp, otpExpiry, photo, nid]
            : [fullName, ageNum, gender, modifiedEmail, hashedPassword, userID, otp, otpExpiry, photo, finalNID, 0, 'Pending'];

        await connection.execute(insertQuery, insertParams);
        console.log(`✅ Inserted user with ID: ${userID}`);

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

// Email sender
const sendOTP = async (email, otp, userID, role, photo) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'timalsinadipendra125@gmail.com',
                pass: 'gtfc mlza rgzr vlwx',
            }
        });

        const mailOptions = {
            from: `"Election Commission" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Your Registration Details',
            html: `
                <h3>Welcome to the Online Voting System!</h3>
                <p><strong>Your OTP:</strong> ${otp}</p>
                <p><strong>Your ${role === "Admin" ? "Admin ID" : "Voter ID"}:</strong> ${userID}</p>
                <p><strong>Your Photo (KYC):</strong></p>
                <img src="${photo}" alt="KYC Photo" width="150" style="border-radius: 10px;" />
                <p>Please use this ID for login and verification.</p>
                ${role === "Voter" ? "<p>Your account is pending verification. You will be notified once your account is verified.</p>" : ""}
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent to ${email}`);
    } catch (error) {
        console.error("❌ Failed to send OTP email:", error);
        throw new Error("Failed to send OTP email.");
    }
};

module.exports = createCustomer;
