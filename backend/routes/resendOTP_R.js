const express = require('express');
const router = express.Router();
const resendOTP = require('../controllers/resendotp'); 

router.post('/resend-otp', resendOTP);
module.exports = router;
