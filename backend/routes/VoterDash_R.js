const express = require('express');
const router = express.Router();
const VoterDash = require('../controllers/VoterDash');

// You probably forgot to do something like this:
router.use('/', VoterDash); 

module.exports = router;
