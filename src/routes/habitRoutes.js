const express = require('express');
const { body } = require('express-validator');
const {
  createHabit,
  getHabits,
  getHabitById,
  updateHabit,
  toggleArchiveHabit,
  deleteHabit
} = require('../controllers/habitController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validator');

const router = express.Router();

router.use(protect); // All habit routes require authentication

router.post(
  '/',
  [
    body('title').trim().notEmpty().withMessage('Habit title is required'),
    body('type')
      .optional()
      .isIn(['boolean', 'measurable', 'pomodoro'])
      .withMessage('Invalid habit type'),
    body('targetValue')
      .optional()
      .isNumeric({ min: 1 })
      .withMessage('Target value must be a number greater than 0'),
    validate
  ],
  createHabit
);

router.get('/', getHabits);
router.get('/:id', getHabitById);
router.put('/:id', updateHabit);
router.patch('/:id/archive', toggleArchiveHabit);
router.delete('/:id', deleteHabit);

module.exports = router;
