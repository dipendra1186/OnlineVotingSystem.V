const express = require("express");
const createCustomer = require("../controllers/signup"); 

const router = express.Router();

router.post("/", createCustomer);

module.exports = router;
