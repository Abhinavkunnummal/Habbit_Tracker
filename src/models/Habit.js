const mongoose = require('mongoose');

const habitSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Habit title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters']
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    type: {
      type: String,
      required: true,
      enum: {
        values: ['boolean', 'measurable', 'pomodoro'],
        message: '{VALUE} is not a valid habit type'
      },
      default: 'boolean'
    },
    targetValue: {
      type: Number,
      required: true,
      default: 1,
      min: [1, 'Target value must be at least 1']
    },
    unit: {
      type: String,
      trim: true,
      default: '' // e.g. "glasses", "pages", "sessions"
    },
    color: {
      type: String,
      default: '#39d353' // GitHub neon green default
    },
    icon: {
      type: String,
      default: 'check_circle'
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekdays', 'weekends', 'custom'],
      default: 'daily'
    },
    targetDays: {
      type: [Number], // 0: Sunday, 1: Monday, ..., 6: Saturday
      default: [0, 1, 2, 3, 4, 5, 6]
    },
    currentStreak: {
      type: Number,
      default: 0,
      min: 0
    },
    bestStreak: {
      type: Number,
      default: 0,
      min: 0
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Compound index for user query performance
habitSchema.index({ userId: 1, isArchived: 1 });

const Habit = mongoose.model('Habit', habitSchema);

module.exports = Habit;
