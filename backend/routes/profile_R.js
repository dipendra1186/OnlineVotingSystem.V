const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profile');

/**
 * @route GET /api/user/profile
 * @desc Get user profile information
 * @access Private
 */
router.get('/', profileController.getUserProfile);

module.exports = router;