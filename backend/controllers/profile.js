const db = require('../config/db');

const maskEmail = (email) => {
    if (!email) return '';
    const [local, domain] = email.split('@');
    const domainName = domain.split('.')[0];
    return `${local}@${domainName}-rp`;
};

const getUserProfile = async (req, res) => {
    const userID = req.query.id;

    if (!userID) {
        return res.status(400).json({
            success: false,
            message: 'User ID is required'
        });
    }

    try {
        // Try Voter table
        let [voters] = await db.query(
            'SELECT voterID AS id, fullName AS name, email, isVerified, photo FROM voters WHERE voterID = ?',
            [userID]
        );

        if (voters.length > 0) {
            const user = { ...voters[0], role: 'Voter' };
            user.email = maskEmail(user.email);
            return res.json({
                success: true,
                user
            });
        }

        // Try Admin table
        let [admins] = await db.query(
            `SELECT 
                id, 
                fullName AS name, 
                age, 
                gender, 
                email, 
                adminID, 
                createdAt,
                isVerified 
            FROM admins 
            WHERE adminID = ?`, 
            [userID]
        );

        if (admins.length > 0) {
            const user = { ...admins[0], role: 'Admin' };
            user.email = maskEmail(user.email);
            user.isVerified = user.isVerified || 'VIP';

            return res.json({
                success: true,
                user
            });
        }

        return res.status(404).json({
            success: false,
            message: 'User not found'
        });

    } catch (err) {
        console.error('Error fetching profile:', err);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        });
    }
};

module.exports = {
    getUserProfile
};
