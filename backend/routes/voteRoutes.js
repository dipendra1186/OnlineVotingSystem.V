const express = require("express");
const router = express.Router();
const voteController = require("../controllers/VoteController");

router.get("/candidates", voteController.getCandidates);
router.get("/election-time", voteController.getElectionTime);
router.post("/cast-vote", voteController.castVote);

module.exports = router;
