const express = require('express');
const router = express.Router();
const getResults = require('../controllers/results');

// Fetch ended elections
router.get('/ended-elections', getResults.getEndedElections);

// Fetch results for a specific election
router.get('/election-results', getResults.getElectionResults);

module.exports = router;
