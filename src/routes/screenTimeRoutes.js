const express = require('express');
const {
  getScreenTime,
  logScreenTime
} = require('../controllers/screenTimeController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/', getScreenTime);
router.post('/', logScreenTime);

module.exports = router;
