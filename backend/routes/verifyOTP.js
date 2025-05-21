const express = require('express');
const EventEmitter = require('events');
EventEmitter.defaultMaxListeners = 20;

const router = express.Router();
const verifyOTPController = require('../controllers/verify-otp');

router.post('/verify-otp', verifyOTPController.verifyOTP);

module.exports = router;
