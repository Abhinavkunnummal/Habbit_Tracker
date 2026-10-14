const ExpenseItem = require('../models/ExpenseItem');
const { getTodayDateString } = require('../utils/dateUtils');

/**
 * @desc Get expenses for a specific date or month
 * @route GET /api/expenses
 */
const getExpenses = async (req, res, next) => {
  try {
    const { date, month } = req.query;
    const query = { userId: req.user.id };

    if (date) {
      query.dateString = date;
    } else if (month) {
      // e.g. "2026-10" matches "2026-10-XX"
      query.dateString = { $regex: `^${month}` };
    } else {
      query.dateString = getTodayDateString();
    }

    const expenses = await ExpenseItem.find(query).sort({ createdAt: -1 });

    const totalAmount = expenses.reduce((sum, item) => sum + item.amount, 0);

    // Group by category
    const byCategory = {};
    expenses.forEach(item => {
      byCategory[item.category] = (byCategory[item.category] || 0) + item.amount;
    });

    res.status(200).json({
      success: true,
      count: expenses.length,
      totalAmount,
      byCategory,
      expenses
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Create an expense entry
 * @route POST /api/expenses
 */
const createExpense = async (req, res, next) => {
  try {
    const { title, amount, category, currency, dateString } = req.body;

    const expense = await ExpenseItem.create({
      userId: req.user.id,
      title,
      amount: Number(amount),
      category: category || 'food',
      currency: currency || '$',
      dateString: dateString || getTodayDateString()
    });

    res.status(201).json({
      success: true,
      expense
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Delete an expense
 * @route DELETE /api/expenses/:id
 */
const deleteExpense = async (req, res, next) => {
  try {
    const expense = await ExpenseItem.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    res.status(200).json({ success: true, message: 'Expense deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getExpenses,
  createExpense,
  deleteExpense
};
