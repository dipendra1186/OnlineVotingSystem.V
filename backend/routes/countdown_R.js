const express = require("express");
const router = express.Router();
const countdownController = require("../controllers/countdown");

// Route to set election time
router.post("/set", countdownController.setElectionTime);

// Route to get election time
router.get("/get/:adminId", countdownController.getElectionTime);

// Route to cancel election time
router.post("/cancel", countdownController.cancelElectionTime);

module.exports = router;
