const express = require('express');
const { getHeatmapData } = require('../controllers/heatmapController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect); // Heatmap requires authentication

router.get('/', getHeatmapData);

module.exports = router;
