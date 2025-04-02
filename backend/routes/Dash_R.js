const express = require("express");
const dashboardController = require("../controllers/Dash"); 

const router = express.Router();

// Define routes correctly
router.get("/totalVoters", dashboardController.totalVoters);
router.get("/candidates", dashboardController.getCandidates);
router.get("/votes", dashboardController.getVotes);
router.get("/electionEndTime", dashboardController.getElectionEndTime);
router.get("/voter/:voterID", dashboardController.getVoterDetails);
router.post("/vote", dashboardController.castVote);

module.exports = router;
