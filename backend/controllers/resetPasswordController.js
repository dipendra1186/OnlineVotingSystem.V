const bcrypt = require('bcrypt');
const db = require('../config/db');


const resetPassword = async (req, res) => {
    const { token, ID, password, confirmPassword } = req.body;

    if (!token || !ID) return res.status(400).json({ success: false, message: "Invalid reset link." });
    if (!password || !confirmPassword) return res.status(400).json({ success: false, message: "Password and confirmation are required." });
    if (password !== confirmPassword) return res.status(400).json({ success: false, message: "Passwords do not match." });
    if (password.length < 8) return res.status(400).json({ success: false, message: "Password must be at least 8 characters long." });

    let connection;
    try {
        connection = await db.getConnection();

        const firstChar = ID[0];
        let tablesToCheck = [];

        if (!isNaN(firstChar)) {
            // Starts with a number: check `nid` in both tables
            tablesToCheck = [
                { table: 'voters', idColumn: 'nid' },
                { table: 'admins', idColumn: 'nid' }
            ];
        } else if (firstChar.toUpperCase() === 'V') {
            tablesToCheck = [
                { table: 'voters', idColumn: 'voterID' },
                { table: 'admins', idColumn: 'adminID' }
            ];
        } else {
            tablesToCheck = [
                { table: 'admins', idColumn: 'adminID' },
                { table: 'voters', idColumn: 'voterID' }
            ];
        }

        let userFound = false, table = '', idColumn = '', currentPassword = '';

        for (const tableInfo of tablesToCheck) {
            const [users] = await connection.execute(
                `SELECT password FROM ${tableInfo.table} WHERE ${tableInfo.idColumn} = ? AND resetToken = ? AND resetTokenExpiry > NOW()`,
                [ID, token]
            );
            if (users.length > 0) {
                userFound = true;
                currentPassword = users[0].password;
                table = tableInfo.table;
                idColumn = tableInfo.idColumn;
                break;
            }
        }

        if (!userFound) return res.status(404).json({ success: false, message: "Invalid or expired reset token." });

        const passwordMatch = await bcrypt.compare(password, currentPassword);
        if (passwordMatch) return res.status(400).json({ success: false, message: "New password must be different from the current one." });

        const hashedPassword = await bcrypt.hash(password, 10);

        // Password strength validation
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;

        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                message: 'Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one digit, and one special character (!@#$%^&*).'
            });
        }


        await connection.execute(
            `UPDATE ${table} SET password = ?, resetToken = NULL, resetTokenExpiry = NULL WHERE ${idColumn} = ?`,
            [hashedPassword, ID]
        );

        res.status(200).json({ success: true, message: "Password reset successfully! You can now log in with your new password." });

    } catch (error) {
        console.error("Error in reset-password:", error);
        res.status(500).json({ success: false, message: "Server error. Please try again later." });
    } finally {
        if (connection) connection.release();
    }
};

module.exports = resetPassword;
