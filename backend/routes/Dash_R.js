const express = require("express");
const dashboardController = require("../controllers/Dash"); 

const router = express.Router();

// Define routes correctly
router.get("/allElections", dashboardController.getAllElections); 
router.get("/totalVoters", dashboardController.gettotalVoters);
router.get("/candidates/:electionId", dashboardController.getCandidates);
router.get('/totalVotesByElection/:electionId', dashboardController.getTotalVotesByElection);
router.get("/electionEndTime/:electionId", dashboardController.getElectionEndTime);
router.get('/elections/:electionId/liveVotes', dashboardController.getLiveVotes);


module.exports = router;
