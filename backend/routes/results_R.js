const express = require('express');
const router = express.Router();
const getResults = require('../controllers/results');

// results_R.js
router.get('/', getResults);


module.exports = router;
