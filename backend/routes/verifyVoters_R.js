const express = require('express');
const router = express.Router();
const verifyVotersController = require('../controllers/verifyVoters');

router.get('/pending', verifyVotersController.getPendingVoters);
router.put('/verify/:voterID', verifyVotersController.verifyVoter);
router.put('/reject/:voterID', verifyVotersController.rejectVoter); 

module.exports = router;
