const mongoose = require('mongoose');

const habitLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    habitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Habit',
      required: true,
      index: true
    },
    dateString: {
      type: String,
      required: [true, 'Date string is required in YYYY-MM-DD format'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'dateString must be in YYYY-MM-DD format'],
      index: true
    },
    value: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    targetValue: {
      type: Number,
      required: true,
      default: 1,
      min: 1
    },
    isCompleted: {
      type: Boolean,
      default: false,
      index: true
    },
    notes: {
      type: String,
      trim: true,
      default: '',
      maxlength: 300
    }
  },
  {
    timestamps: true
  }
);

// Ensure only one log exists per habit per calendar day
habitLogSchema.index({ habitId: 1, dateString: 1 }, { unique: true });

// Compound index for user date-range and heatmap queries
habitLogSchema.index({ userId: 1, dateString: 1, isCompleted: 1 });

const HabitLog = mongoose.model('HabitLog', habitLogSchema);

module.exports = HabitLog;
