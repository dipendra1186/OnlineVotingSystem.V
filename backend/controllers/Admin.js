import mysql from 'mysql2/promise';
import * as readline from 'readline';
import bcrypt from 'bcrypt';

// DB connection
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'online_voting_system',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Readline interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Ask a terminal question
const askQuestion = (question) => {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.trim());
        });
    });
};

// Generate a unique adminID
const generateUniqueAdminID = async (firstName, lastName) => {
    const prefix = 'A' + firstName.charAt(0).toUpperCase() + lastName.charAt(0).toUpperCase();
    let uniqueID;
    let isUnique = false;

    while (!isUnique) {
        const randomNumber = Math.floor(10000 + Math.random() * 90000); // 5-digit number
        uniqueID = `${prefix}${randomNumber}`;

        const [existing] = await db.query('SELECT * FROM admins WHERE adminID = ?', [uniqueID]);
        if (existing.length === 0) {
            isUnique = true;
        }
    }

    return uniqueID;
};

// Close DB & readline (safely)
let closed = false;
const closeConnection = async () => {
    if (!closed) {
        rl.close();
        await db.end();
        closed = true;
    }
};

// Create admin
const createAdmin = async () => {
    try {
        console.log('\n🗳️  === Create Admin for Online Voting System ===\n');

        const fullName = await askQuestion('Full Name: ');
        let email = await askQuestion('Email: ');
        const password = await askQuestion('Password (min 6 characters): ');
        const gender = await askQuestion('Gender (Male/Female/Other): ');
        const age = await askQuestion('Age: ');

        // Validation
        if (!fullName || !email || !password || !gender || !age) {
            throw new Error('All fields are required.');
        }

        // Email validation
        const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
        if (!emailRegex.test(email)) {
            throw new Error('Please enter a valid email address.');
        }

        // Check if the email exists and modify email format if needed
        let [existing] = await db.query('SELECT * FROM admins WHERE email = ?', [email]);
        if (existing.length > 0) {
            const nameParts = fullName.trim().split(' ');
            const firstName = nameParts[0];
            const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : firstName;

            const modifiedEmail = `${email}-${firstName.charAt(0).toLowerCase()}${lastName.charAt(0).toLowerCase()}`;

            // Check if the modified email already exists
            [existing] = await db.query('SELECT * FROM admins WHERE email = ?', [modifiedEmail]);
            if (existing.length > 0) {
                throw new Error(`Admin with email ${modifiedEmail} already exists.`);
            }

            // Use the modified email
            email = modifiedEmail;
        }


        // Password validation
        if (password.length < 6) {
            throw new Error('Password must be at least 6 characters.');
        }
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/; // At least one letter and one number
        if (!passwordRegex.test(password)) {
            throw new Error('Password must contain at least one letter and one number.');
        }

        // Age validation
        if (isNaN(parseInt(age)) || parseInt(age) < 18) {
            throw new Error('Age must be a number and at least 18.');
        }

        // Extract first and last name
        const nameParts = fullName.trim().split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : firstName;

        const adminID = await generateUniqueAdminID(firstName, lastName);

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new admin
        const [result] = await db.query(
            'INSERT INTO admins (adminID, fullName, email, password, gender, age) VALUES (?, ?, ?, ?, ?, ?)',
            [adminID, fullName, email, hashedPassword, gender, age || null]
        );

        console.log(`\n✅ Success! Admin created.`);
        console.log(`🆔 Admin ID: ${adminID}`);
        console.log(`🔑 Login Email: ${email}`);
    } catch (error) {
        console.error('\n🔥 Error:', error.message);
    } finally {
        await closeConnection();
    }
};

// Run
createAdmin();
