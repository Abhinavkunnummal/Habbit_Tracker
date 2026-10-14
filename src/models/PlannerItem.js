const mongoose = require('mongoose');

const plannerItemSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: 120
    },
    dateString: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'dateString must be YYYY-MM-DD'],
      index: true
    },
    startTime: {
      type: String,
      required: true,
      default: '09:00' // e.g. "09:30"
    },
    endTime: {
      type: String,
      required: true,
      default: '10:00'
    },
    type: {
      type: String,
      enum: ['meeting', 'focus_block', 'workout', 'study', 'routine', 'personal'],
      default: 'meeting'
    },
    linkOrLocation: {
      type: String,
      trim: true,
      default: '' // Google Meet, Zoom, or room name
    },
    isCompleted: {
      type: Boolean,
      default: false
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

plannerItemSchema.index({ userId: 1, dateString: 1, startTime: 1 });

const PlannerItem = mongoose.model('PlannerItem', plannerItemSchema);

module.exports = PlannerItem;
