const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.post('/api/getVoterDetails', async (req, res) => {
  const { voterID } = req.body;

  if (!voterID) return res.status(400).json({ success: false, message: 'Voter ID required' });

  try {
    const [rows] = await db.query('SELECT fullName, isVerified, has_voted FROM voters WHERE voterID = ?', [voterID]);

    if (rows.length > 0) {
      res.json({ 
        success: true,
        fullName: rows[0].fullName,
        isVerified: rows[0].isVerified,
        has_voted: rows[0].has_voted
      });
    } else {
      res.json({ success: false, message: 'Voter not found' });
    }
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});


// API to get notifications
router.get('/api/notifications', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM notifications ORDER BY created_at DESC');

        if (rows.length > 0) {
            res.json({ success: true, notifications: rows });
        } else {
            res.json({ success: false, message: 'No notifications found' });
        }
    } catch (err) {
        console.error('Database fetch error:', err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// Get featured election
router.get('/api/featuredelection', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT name, description, start_time, end_time, status FROM election_times ORDER BY id DESC LIMIT 1');

    if (rows.length > 0) {
      res.json({ success: true, election: rows[0] });
    } else {
      res.json({ success: false, message: 'No election found' });
    }
  } catch (err) {
    console.error('Database fetch error:', err);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});



module.exports = router;
