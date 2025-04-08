const express = require('express');
const router = express.Router();
const verifyVotersController = require('../controllers/verifyVoters');

// GET all unverified voters
router.get('/pending', verifyVotersController.getPendingVoters);

// PUT verify a voter
router.put('/verify/:voterID', verifyVotersController.verifyVoter);

module.exports = router;
