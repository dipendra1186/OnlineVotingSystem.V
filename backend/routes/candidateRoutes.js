const express = require("express");
const candidateController = require("../controllers/candidateController");

const router = express.Router();

// Routes for handling candidate operations
router.post("/candidates", candidateController.createCandidate);
router.get("/candidates", candidateController.getCandidates);
router.get("/election_times", candidateController.getElections);
router.get("/candidates/:id", candidateController.getCandidateById);
router.put("/candidates/:id", candidateController.updateCandidate);
router.delete("/candidates/:id", candidateController.deleteCandidate);

module.exports = router;
