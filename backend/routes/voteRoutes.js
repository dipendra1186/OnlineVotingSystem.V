const express = require("express");
const router = express.Router();
const voteController = require("../controllers/VoteController");
const blockchain = require("../blockchain/blockchain");

// 📋 Candidates and Elections
router.get("/candidates/:electionId", voteController.getCandidates);
router.get("/election-time", voteController.getElectionTime);
router.get("/elections", voteController.getElections);
router.get("/available-elections", voteController.getAvailableElections);

// ✅ Voting Logic
router.post("/cast-vote", voteController.castVote);
router.get("/voter-status", voteController.checkVoterStatus);
router.get("/voter-history", voteController.getVoterElectionHistory);

// 📊 Election Results
router.get("/results", voteController.getElectionResults);

// 🔗 Blockchain Ledger
router.get("/blockchain", (req, res) => {
    res.json(blockchain.chain);
});

module.exports = router;
