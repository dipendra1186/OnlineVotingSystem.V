const express = require('express');
const router = express.Router();
const verifyOTPController = require('../controllers/verify-otp');

router.post('/verify-otp', verifyOTPController); // ✅ Route is correct

module.exports = router;
