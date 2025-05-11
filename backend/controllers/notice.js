const db = require('../config/db'); // your promise-based MySQL pool


exports.getAllNotices = async (req, res) => {
  try {
    const [notices] = await db.query('SELECT * FROM notifications ORDER BY created_at DESC');
    res.status(200).json(notices);
  } catch (error) {
    console.error('Error fetching notices from database:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

