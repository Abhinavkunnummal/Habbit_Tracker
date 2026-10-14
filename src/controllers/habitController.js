const Habit = require('../models/Habit');
const HabitLog = require('../models/HabitLog');
const PomodoroSession = require('../models/PomodoroSession');
const { getTodayDateString } = require('../utils/dateUtils');
const { calculateStreaks } = require('../utils/streakCalculator');

/**
 * @desc    Create a new habit
 * @route   POST /api/habits
 * @access  Private
 */
const createHabit = async (req, res, next) => {
  try {
    const {
      title,
      description,
      type,
      targetValue,
      unit,
      color,
      icon,
      frequency,
      targetDays
    } = req.body;

    const habitType = type || 'boolean';
    let target = Number(targetValue) || 1;
    if (habitType === 'boolean') {
      target = 1;
    }

    const habit = await Habit.create({
      userId: req.user.id,
      title,
      description: description || '',
      type: habitType,
      targetValue: target,
      unit: unit || (habitType === 'pomodoro' ? 'sessions' : ''),
      color: color || '#39d353',
      icon: icon || 'check_circle',
      frequency: frequency || 'daily',
      targetDays: targetDays || [0, 1, 2, 3, 4, 5, 6]
    });

    res.status(201).json({
      success: true,
      habit
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all active habits for the authenticated user (with optional today's log status)
 * @route   GET /api/habits
 * @access  Private
 */
const getHabits = async (req, res, next) => {
  try {
    const { includeArchived, date } = req.query;
    const targetDate = date || getTodayDateString();

    const query = { userId: req.user.id };
    if (includeArchived !== 'true') {
      query.isArchived = false;
    }

    const habits = await Habit.find(query).sort({ createdAt: -1 });

    // Fetch logs for the targeted date in one single query
    const habitIds = habits.map(h => h._id);
    const logs = await HabitLog.find({
      userId: req.user.id,
      habitId: { $in: habitIds },
      dateString: targetDate
    });

    // Map logs by habitId
    const logMap = new Map();
    logs.forEach(log => {
      logMap.set(log.habitId.toString(), log);
    });

    // Attach todayLog to each habit
    const habitsWithTodayLog = habits.map(habit => {
      const habitObj = habit.toObject();
      const log = logMap.get(habit._id.toString());
      habitObj.todayLog = log || {
        value: 0,
        targetValue: habit.targetValue,
        isCompleted: false,
        dateString: targetDate
      };
      return habitObj;
    });

    res.status(200).json({
      success: true,
      count: habitsWithTodayLog.length,
      targetDate,
      habits: habitsWithTodayLog
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single habit by ID with recent logs and streak statistics
 * @route   GET /api/habits/:id
 * @access  Private
 */
const getHabitById = async (req, res, next) => {
  try {
    const habit = await Habit.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!habit) {
      return res.status(404).json({
        success: false,
        message: 'Habit not found'
      });
    }

    // Get recent 30 days of logs for this habit
    const recentLogs = await HabitLog.find({
      habitId: habit._id,
      userId: req.user.id
    })
      .sort({ dateString: -1 })
      .limit(30);

    const todayLog = await HabitLog.findOne({
      habitId: habit._id,
      userId: req.user.id,
      dateString: getTodayDateString()
    });

    res.status(200).json({
      success: true,
      habit: {
        ...habit.toObject(),
        todayLog: todayLog || {
          value: 0,
          targetValue: habit.targetValue,
          isCompleted: false,
          dateString: getTodayDateString()
        },
        recentLogs
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a habit
 * @route   PUT /api/habits/:id
 * @access  Private
 */
const updateHabit = async (req, res, next) => {
  try {
    const {
      title,
      description,
      targetValue,
      unit,
      color,
      icon,
      frequency,
      targetDays
    } = req.body;

    const habit = await Habit.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!habit) {
      return res.status(404).json({
        success: false,
        message: 'Habit not found'
      });
    }

    if (title !== undefined) habit.title = title;
    if (description !== undefined) habit.description = description;
    if (targetValue !== undefined && habit.type !== 'boolean') {
      habit.targetValue = Number(targetValue);
    }
    if (unit !== undefined) habit.unit = unit;
    if (color !== undefined) habit.color = color;
    if (icon !== undefined) habit.icon = icon;
    if (frequency !== undefined) habit.frequency = frequency;
    if (targetDays !== undefined) habit.targetDays = targetDays;

    await habit.save();

    res.status(200).json({
      success: true,
      habit
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Archive / unarchive a habit
 * @route   PATCH /api/habits/:id/archive
 * @access  Private
 */
const toggleArchiveHabit = async (req, res, next) => {
  try {
    const habit = await Habit.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!habit) {
      return res.status(404).json({
        success: false,
        message: 'Habit not found'
      });
    }

    habit.isArchived = !habit.isArchived;
    await habit.save();

    res.status(200).json({
      success: true,
      message: `Habit ${habit.isArchived ? 'archived' : 'unarchived'} successfully`,
      habit
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a habit and its associated logs
 * @route   DELETE /api/habits/:id
 * @access  Private
 */
const deleteHabit = async (req, res, next) => {
  try {
    const habit = await Habit.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!habit) {
      return res.status(404).json({
        success: false,
        message: 'Habit not found'
      });
    }

    // Remove habit, habit logs, and detach linked pomodoro sessions
    await HabitLog.deleteMany({ habitId: habit._id, userId: req.user.id });
    await PomodoroSession.updateMany(
      { habitId: habit._id, userId: req.user.id },
      { $set: { habitId: null } }
    );
    await habit.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Habit and linked logs deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createHabit,
  getHabits,
  getHabitById,
  updateHabit,
  toggleArchiveHabit,
  deleteHabit
};
