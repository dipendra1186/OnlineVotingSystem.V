const express = require("express");
const router = express.Router();
const voteController = require("../controllers/VoteController");
const blockchain = require("../controllers/blockchain"); 

router.get("/candidates", voteController.getCandidates);
router.get("/election-time", voteController.getElectionTime);
router.post("/cast-vote", voteController.castVote);

// 📦 View blockchain ledger
router.get("/blockchain", (req, res) => {
    res.json(blockchain.chain);
});

module.exports = router;
