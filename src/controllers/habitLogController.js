const Habit = require('../models/Habit');
const HabitLog = require('../models/HabitLog');
const { getTodayDateString } = require('../utils/dateUtils');
const { calculateStreaks } = require('../utils/streakCalculator');

/**
 * Helper to recalculate streaks for a specific habit and persist them.
 * @param {string} habitId 
 * @param {string} userId 
 * @returns {Promise<{ currentStreak: number, bestStreak: number }>}
 */
const recalculateHabitStreaks = async (habitId, userId) => {
  const completedLogs = await HabitLog.find({
    habitId,
    userId,
    isCompleted: true
  }).select('dateString');

  const completedDates = completedLogs.map(log => log.dateString);
  const { currentStreak, bestStreak } = calculateStreaks(completedDates);

  await Habit.findByIdAndUpdate(habitId, {
    currentStreak,
    bestStreak
  });

  return { currentStreak, bestStreak };
};

/**
 * @desc    Log or update daily habit progress
 * @route   POST /api/logs
 * @access  Private
 */
const logHabit = async (req, res, next) => {
  try {
    const { habitId, dateString, value, notes, isCompleted } = req.body;
    const targetDate = dateString || getTodayDateString();

    const habit = await Habit.findOne({ _id: habitId, userId: req.user.id });
    if (!habit) {
      return res.status(404).json({
        success: false,
        message: 'Habit not found'
      });
    }

    const logValue = value !== undefined ? Number(value) : habit.targetValue;
    let completed = false;

    if (isCompleted !== undefined) {
      completed = Boolean(isCompleted);
    } else {
      completed = logValue >= habit.targetValue;
    }

    // Upsert the log for this habit and date
    const log = await HabitLog.findOneAndUpdate(
      {
        userId: req.user.id,
        habitId: habit._id,
        dateString: targetDate
      },
      {
        value: logValue,
        targetValue: habit.targetValue,
        isCompleted: completed,
        notes: notes !== undefined ? notes : ''
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      }
    );

    // Recalculate streak
    const streaks = await recalculateHabitStreaks(habit._id, req.user.id);

    res.status(200).json({
      success: true,
      log,
      streaks
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Quick 1-tap toggle for habit completion today
 * @route   POST /api/logs/toggle-today
 * @access  Private
 */
const toggleHabitToday = async (req, res, next) => {
  try {
    const { habitId, dateString } = req.body;
    const targetDate = dateString || getTodayDateString();

    const habit = await Habit.findOne({ _id: habitId, userId: req.user.id });
    if (!habit) {
      return res.status(404).json({
        success: false,
        message: 'Habit not found'
      });
    }

    const existingLog = await HabitLog.findOne({
      userId: req.user.id,
      habitId: habit._id,
      dateString: targetDate
    });

    const isCurrentlyCompleted = existingLog ? existingLog.isCompleted : false;
    const nextCompleted = !isCurrentlyCompleted;
    const nextValue = nextCompleted ? habit.targetValue : 0;

    const log = await HabitLog.findOneAndUpdate(
      {
        userId: req.user.id,
        habitId: habit._id,
        dateString: targetDate
      },
      {
        value: nextValue,
        targetValue: habit.targetValue,
        isCompleted: nextCompleted
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      }
    );

    const streaks = await recalculateHabitStreaks(habit._id, req.user.id);

    res.status(200).json({
      success: true,
      log,
      streaks,
      isCompleted: nextCompleted
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Quick increment for measurable/pomodoro habits (e.g. +1 glass or +1 session)
 * @route   POST /api/logs/increment
 * @access  Private
 */
const incrementHabit = async (req, res, next) => {
  try {
    const { habitId, dateString, amount = 1 } = req.body;
    const targetDate = dateString || getTodayDateString();
    const incAmount = Number(amount) || 1;

    const habit = await Habit.findOne({ _id: habitId, userId: req.user.id });
    if (!habit) {
      return res.status(404).json({
        success: false,
        message: 'Habit not found'
      });
    }

    const existingLog = await HabitLog.findOne({
      userId: req.user.id,
      habitId: habit._id,
      dateString: targetDate
    });

    const currentValue = existingLog ? existingLog.value : 0;
    const newValue = Math.max(0, currentValue + incAmount);
    const completed = newValue >= habit.targetValue;

    const log = await HabitLog.findOneAndUpdate(
      {
        userId: req.user.id,
        habitId: habit._id,
        dateString: targetDate
      },
      {
        value: newValue,
        targetValue: habit.targetValue,
        isCompleted: completed
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      }
    );

    const streaks = await recalculateHabitStreaks(habit._id, req.user.id);

    res.status(200).json({
      success: true,
      log,
      streaks
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get logs for a habit or date range
 * @route   GET /api/logs
 * @access  Private
 */
const getHabitLogs = async (req, res, next) => {
  try {
    const { habitId, startDate, endDate, dateString } = req.query;

    const query = { userId: req.user.id };
    if (habitId) query.habitId = habitId;
    if (dateString) query.dateString = dateString;
    if (startDate && endDate) {
      query.dateString = { $gte: startDate, $lte: endDate };
    }

    const logs = await HabitLog.find(query).sort({ dateString: -1 });

    res.status(200).json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  logHabit,
  toggleHabitToday,
  incrementHabit,
  getHabitLogs,
  recalculateHabitStreaks
};
