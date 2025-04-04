const express = require('express');
const router = express.Router();
const forgotPasswordController = require('../controllers/forgotPasswordController');

// Remove the path since it's already included in app.use("/api/forgot-password", ...)
router.post('/', forgotPasswordController);

module.exports = router;