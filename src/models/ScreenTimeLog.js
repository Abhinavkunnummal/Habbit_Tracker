const mongoose = require('mongoose');

const screenTimeLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    dateString: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'dateString must be YYYY-MM-DD'],
      index: true
    },
    totalMinutes: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    productiveMinutes: {
      type: Number,
      default: 0,
      min: 0
    },
    entertainmentMinutes: {
      type: Number,
      default: 0,
      min: 0
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// One screen time entry per user per day
screenTimeLogSchema.index({ userId: 1, dateString: 1 }, { unique: true });

const ScreenTimeLog = mongoose.model('ScreenTimeLog', screenTimeLogSchema);

module.exports = ScreenTimeLog;
