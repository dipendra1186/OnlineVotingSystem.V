const express = require('express');
const router = express.Router();
const db = require('../config/db');


router.post('/api/getVoterDetails', async (req, res) => {
  const { voterID } = req.body;

  if (!voterID) {
    return res.status(400).json({ success: false, message: 'Voter ID is required' });
  }

  try {
    const [rows] = await db.query(
      'SELECT fullName, isVerified, has_voted, status, rejected_at FROM voters WHERE voterID = ?',
      [voterID]
    );

    if (rows.length > 0) {
      res.json({
        success: true,
        fullName: rows[0].fullName,
        isVerified: rows[0].isVerified,
        has_voted: rows[0].has_voted,
        status: rows[0].status,
        rejected_at: rows[0].rejected_at
      });
    } else {
      res.json({ success: false, message: 'Voter not found' });
    }
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.get('/api/active-elections', async (req, res) => {
    try {
        const [rows] = await db.execute(
            "SELECT COUNT(*) AS count FROM election_times WHERE status = 'ongoing'"
        );
        res.json({ count: rows[0].count });
    } catch (error) {
        // Do not log to console, return generic error
        res.status(500).json({ error: 'Failed to fetch active elections' });
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

// Get featured elections (all ongoing elections)
router.get('/api/featuredelection', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT name, description, start_time, end_time, status FROM election_times WHERE status = "ongoing" ORDER BY id DESC');

    if (rows.length > 0) {
      res.json({ success: true, elections: rows });  // Return all ongoing elections
    } else {
      res.json({ success: false, message: 'No ongoing elections found' });
    }
  } catch (err) {
    console.error('Database fetch error:', err);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});


module.exports = router;
