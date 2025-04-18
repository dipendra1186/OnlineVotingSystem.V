// routes/countdown_R.js
const express = require("express");
const router = express.Router();
const countdownController = require("../controllers/countdown");
const verifycountdown = require("../middleware/countdown");


/**
 * Countdown Routes
 * Handles election time management functionality
 */

// Admin routes for election time management

// Test route to check if router is working
router.get("/test", (req, res) => {
  res.status(200).json({ message: "Countdown router is working" });
});

router.post("/set", countdownController.setElectionTime);
router.get("/get/:adminID", countdownController.getElectionTime);
router.delete("/delete/:adminID", countdownController.deleteElectionTime);

module.exports = router;