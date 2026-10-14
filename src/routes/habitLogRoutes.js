const express = require('express');
const { body } = require('express-validator');
const {
  logHabit,
  toggleHabitToday,
  incrementHabit,
  getHabitLogs
} = require('../controllers/habitLogController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validator');

const router = express.Router();

router.use(protect); // All habit log routes require authentication

router.post(
  '/',
  [
    body('habitId').isMongoId().withMessage('Valid habitId is required'),
    body('dateString')
      .optional()
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('dateString must be in YYYY-MM-DD format'),
    body('value').optional().isNumeric().withMessage('Value must be a number'),
    validate
  ],
  logHabit
);

router.post(
  '/toggle-today',
  [
    body('habitId').isMongoId().withMessage('Valid habitId is required'),
    body('dateString')
      .optional()
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('dateString must be in YYYY-MM-DD format'),
    validate
  ],
  toggleHabitToday
);

router.post(
  '/increment',
  [
    body('habitId').isMongoId().withMessage('Valid habitId is required'),
    body('amount').optional().isNumeric().withMessage('Amount must be a number'),
    body('dateString')
      .optional()
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('dateString must be in YYYY-MM-DD format'),
    validate
  ],
  incrementHabit
);

router.get('/', getHabitLogs);

module.exports = router;
