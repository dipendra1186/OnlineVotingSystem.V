const express = require('express');
const router = express.Router();
const db = require('../config/db');
const env = require('dotenv');
env.config();

// API: Get voter details
router.post('/api/getVoterDetails', async (req, res) => {
  const { voterID } = req.body;

  if (!voterID) {
    return res.status(400).json({ success: false, message: 'Voter ID is required' });
  }

  try {
    const [rows] = await db.query(
      'SELECT fullName, status, rejected_at FROM voters WHERE voterID = ?',
      [voterID]
    );

    if (rows.length > 0) {
      res.json({
        success: true,
        fullName: rows[0].fullName,
    
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

// API: Count of active (ongoing) elections
router.get('/api/active-elections', async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT COUNT(*) AS count FROM election_times WHERE status = 'ongoing'"
    );
    res.json({ count: rows[0].count });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch active elections' });
  }
});

// API: Get all notifications
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

// API: Get featured (ongoing) elections
router.get('/api/featuredelection', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT name, description, start_time, end_time, status FROM election_times WHERE status = "ongoing" ORDER BY id DESC');

    if (rows.length > 0) {
      res.json({ success: true, elections: rows });
    } else {
      res.json({ success: false, message: 'No ongoing elections found' });
    }
  } catch (err) {
    console.error('Database fetch error:', err);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// Updated API route in the router file (server-side)
router.post('/api/verify-request', async (req, res) => {
  const { userID } = req.body;
  if (!userID) {
    return res.status(400).json({ success: false, message: "User ID missing." });
  }
  try {
    // Using the existing db connection instead of connectDB()
    const [rows] = await db.execute(
      'SELECT email, fullName FROM voters WHERE voterID = ?',
      [userID]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Voter not found." });
    }
    const { email, fullName } = rows[0];
    
    // Extract email up to the .com part
    const emailMatch = email.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const cleanEmail = emailMatch ? emailMatch[0] : email;
    
    // Need to import nodemailer at the top of your file
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.email, // Use the environment variable instead of hardcoded password
      }
    });
    await transporter.sendMail({
      from: `"Voting System" <${process.env.EMAIL_USER}>`,
      to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
      subject: 'New Voter Verification Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #1e3a8a;">New Verification Request Received</h2>
          <p style="margin-bottom: 20px; border-bottom: 1px solid #e0e0e0; padding-bottom: 15px;">
            A voter has requested ID verification through the Voter Portal.
          </p>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; width: 140px;">Voter Name:</td>
              <td style="padding: 8px 0;">${fullName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Voter ID:</td>
              <td style="padding: 8px 0;">${userID}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Voter Email:</td>
              <td style="padding: 8px 0;">${cleanEmail}</td>
            </tr>
          </table>
          <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
            <p>Please log into the admin panel to verify this user:</p>
            <a href="https://valid-trivially-sunfish.ngrok-free.app/" 
               style="display: inline-block; background-color: #3b82f6; color: white; padding: 10px 20px; 
                      text-decoration: none; border-radius: 5px; font-weight: bold;">
              Go to Admin Panel
            </a>
          </div>
          <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
            This is an automated message from the Online Voting System.
          </p>
        </div>
      `
    });
    // Update voter status to "Pending" if not already verified
    await db.execute(
      "UPDATE voters SET status = 'Pending' WHERE voterID = ? AND status != 'Verified'",
      [userID]
    );
    // Send success response to frontend
    res.json({ 
      success: true, 
      message: "Verification request sent to admin. Your status has been updated to pending." 
    });
  } catch (error) {
    console.error("Error in verify-request:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to send verification request. Please try again later." 
    });
  }
});
module.exports = router;
