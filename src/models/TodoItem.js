const mongoose = require('mongoose');

const todoItemSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Todo task title is required'],
      trim: true,
      maxlength: 200
    },
    dateString: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'dateString must be YYYY-MM-DD'],
      index: true
    },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium'
    },
    category: {
      type: String,
      trim: true,
      default: 'General'
    },
    isCompleted: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true
  }
);

todoItemSchema.index({ userId: 1, dateString: 1, isCompleted: 1 });

const TodoItem = mongoose.model('TodoItem', todoItemSchema);

module.exports = TodoItem;
