const express = require('express');
const router = express.Router();
const resetPassword = require('../controllers/resetPasswordController');

// Route to handle password reset
router.post('/reset-password', resetPassword);

module.exports = router;
