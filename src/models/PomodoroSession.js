const mongoose = require('mongoose');

const pomodoroSessionSchema = new mongoose.Schema(
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
      default: null,
      index: true
    },
    sessionType: {
      type: String,
      enum: ['focus', 'shortBreak', 'longBreak'],
      default: 'focus'
    },
    durationMinutes: {
      type: Number,
      required: true,
      default: 25,
      min: 1
    },
    startTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ['completed', 'cancelled', 'interrupted'],
      default: 'completed'
    },
    dateString: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'dateString must be in YYYY-MM-DD format'],
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

pomodoroSessionSchema.index({ userId: 1, dateString: 1 });
pomodoroSessionSchema.index({ habitId: 1, status: 1 });

const PomodoroSession = mongoose.model('PomodoroSession', pomodoroSessionSchema);

module.exports = PomodoroSession;
