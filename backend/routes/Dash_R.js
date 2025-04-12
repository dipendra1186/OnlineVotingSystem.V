const express = require("express");
const dashboardController = require("../controllers/Dash"); 

const router = express.Router();

// Define routes correctly
router.get("/totalVoters", dashboardController.gettotalVoters);
router.get("/candidates", dashboardController.getCandidates);
router.get("/getVotes", dashboardController.getVotes);
router.get("/electionEndTime", dashboardController.getElectionEndTime);
router.post("/vote", dashboardController.castVote);

module.exports = router;
