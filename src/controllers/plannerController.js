const PlannerItem = require('../models/PlannerItem');
const { getTodayDateString } = require('../utils/dateUtils');

/**
 * @desc Get timetable schedule & meetings for a specific date
 * @route GET /api/planner
 */
const getPlannerItems = async (req, res, next) => {
  try {
    const { date } = req.query;
    const targetDate = date || getTodayDateString();

    const items = await PlannerItem.find({
      userId: req.user.id,
      dateString: targetDate
    }).sort({ startTime: 1 });

    res.status(200).json({
      success: true,
      targetDate,
      count: items.length,
      items
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Create a timetable entry or scheduled meeting
 * @route POST /api/planner
 */
const createPlannerItem = async (req, res, next) => {
  try {
    const {
      title,
      dateString,
      startTime,
      endTime,
      type,
      linkOrLocation,
      notes
    } = req.body;

    const item = await PlannerItem.create({
      userId: req.user.id,
      title,
      dateString: dateString || getTodayDateString(),
      startTime: startTime || '09:00',
      endTime: endTime || '10:00',
      type: type || 'meeting',
      linkOrLocation: linkOrLocation || '',
      notes: notes || ''
    });

    res.status(201).json({
      success: true,
      item
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Toggle completion of a timetable schedule block
 * @route PATCH /api/planner/:id/toggle
 */
const togglePlannerItem = async (req, res, next) => {
  try {
    const item = await PlannerItem.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    item.isCompleted = !item.isCompleted;
    await item.save();

    res.status(200).json({ success: true, item });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Delete a timetable item
 * @route DELETE /api/planner/:id
 */
const deletePlannerItem = async (req, res, next) => {
  try {
    const item = await PlannerItem.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    res.status(200).json({ success: true, message: 'Item deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPlannerItems,
  createPlannerItem,
  togglePlannerItem,
  deletePlannerItem
};
