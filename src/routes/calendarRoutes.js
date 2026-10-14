const express = require('express');
const { getDaySummary } = require('../controllers/calendarController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/day', getDaySummary);

module.exports = router;
