const express = require('express');
const router = express.Router();
const { getAllNotices } = require('../controllers/notice');

router.get('/notice', getAllNotices);

module.exports = router;
