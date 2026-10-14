const express = require('express');
const { body } = require('express-validator');
const {
  recordSession,
  getSessions,
  getPomodoroStats
} = require('../controllers/pomodoroController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validator');

const router = express.Router();

router.use(protect); // All pomodoro routes require authentication

router.post(
  '/sessions',
  [
    body('sessionType')
      .optional()
      .isIn(['focus', 'shortBreak', 'longBreak'])
      .withMessage('Invalid sessionType'),
    body('durationMinutes')
      .isNumeric({ min: 1 })
      .withMessage('durationMinutes must be at least 1 minute'),
    body('habitId')
      .optional({ nullable: true })
      .isMongoId()
      .withMessage('habitId must be a valid MongoId'),
    body('status')
      .optional()
      .isIn(['completed', 'cancelled', 'interrupted'])
      .withMessage('Invalid status'),
    validate
  ],
  recordSession
);

router.get('/sessions', getSessions);
router.get('/stats', getPomodoroStats);

module.exports = router;
