const express = require("express");
const loginCustomer = require("../controllers/login"); // Ensure correct import

const router = express.Router();

router.post("/", loginCustomer); // Handles login requests

module.exports = router;
