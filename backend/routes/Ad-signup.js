const express = require("express");
const createCustomer = require("../controllers/Ad-signup"); 

const router = express.Router();

router.post("/", createCustomer);

module.exports = router;
