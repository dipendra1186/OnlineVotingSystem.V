const express = require("express");
const router = express.Router();
const countdownController = require("../controllers/countdown");
const verifyAdmin = require("../middleware/countdown");

// Test route
router.get("/test", (req, res) => {
  res.status(200).json({ message: "Countdown router is working" });
});

// Routes with admin check
router.post("/set", verifyAdmin, countdownController.setElectionTime);
router.get("/get/:adminID", verifyAdmin, countdownController.getElectionTime);
router.delete("/delete/:adminID", verifyAdmin, countdownController.deleteElectionTime);

module.exports = router;
