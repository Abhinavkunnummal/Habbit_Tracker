const mongoose = require('mongoose');

const expenseItemSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Expense title is required'],
      trim: true,
      maxlength: 100
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount must be positive']
    },
    currency: {
      type: String,
      default: '$'
    },
    category: {
      type: String,
      enum: ['food', 'transport', 'tech', 'books', 'health', 'bills', 'entertainment', 'other'],
      default: 'food'
    },
    dateString: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'dateString must be YYYY-MM-DD'],
      index: true
    }
  },
  {
    timestamps: true
  }
);

expenseItemSchema.index({ userId: 1, dateString: 1 });

const ExpenseItem = mongoose.model('ExpenseItem', expenseItemSchema);

module.exports = ExpenseItem;
