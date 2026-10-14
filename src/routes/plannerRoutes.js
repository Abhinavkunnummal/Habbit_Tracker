const express = require('express');
const {
  getPlannerItems,
  createPlannerItem,
  togglePlannerItem,
  deletePlannerItem
} = require('../controllers/plannerController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/', getPlannerItems);
router.post('/', createPlannerItem);
router.patch('/:id/toggle', togglePlannerItem);
router.delete('/:id', deletePlannerItem);

module.exports = router;
