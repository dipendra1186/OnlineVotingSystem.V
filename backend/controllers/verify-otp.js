const db = require('../config/db'); // Import the database connection

const verifyOTP = async (req, res) => {
    try {
        console.log('Request Body:', req.body);
        
        const { userID, email, otp } = req.body;

        // Check for missing fields
        if (!userID || !email || !otp) {
            console.log('❌ Missing fields detected');
            return res.status(400).json({ message: 'User ID, Email, and OTP are required' });
        }

        let user = null;
        let table = '';
        let idColumn = '';

        // 🔍 Check in VOTERS table
        const [voterRows] = await db.query("SELECT voterID AS id, email, otp FROM voters WHERE voterID = ?", [userID]);
        if (voterRows.length > 0) {
            user = voterRows[0];
            table = 'voters';
            idColumn = 'voterID';
        }

        // 🔍 Check in ADMINS table if not found in voters
        if (!user) {
            const [adminRows] = await db.query("SELECT adminID AS id, email, otp FROM admins WHERE adminID = ?", [userID]);
            if (adminRows.length > 0) {
                user = adminRows[0];
                table = 'admins';
                idColumn = 'adminID';
            }
        }

        // ❌ No user found
        if (!user) {
            return res.status(400).json({ message: 'Invalid User ID' });
        }

        // Extract original email part (before the suffix)
        // This handles both formats: username-initials@domain.com and username@domain.com-initials
        const storedEmail = user.email;
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

        // ❌ Email does not match
        if (originalEmail !== email) {
            return res.status(400).json({ message: 'Email does not match with User ID' });
        }

        // ❌ OTP is incorrect
        if (user.otp !== otp) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        // ✅ Mark user as verified
        const updateQuery = `UPDATE ${table} SET isVerified = 0 WHERE ${idColumn} = ?`;
        await db.query(updateQuery, [userID]);

        console.log("✅ OTP verified successfully for", table, "UserID:", userID);
        res.status(200).json({ success: true, message: 'OTP verified successfully.', id: userID });

    } catch (error) {
        console.error('❌ Error in OTP verification:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = verifyOTP;