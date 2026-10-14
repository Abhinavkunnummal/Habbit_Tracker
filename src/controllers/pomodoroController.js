const PomodoroSession = require('../models/PomodoroSession');
const Habit = require('../models/Habit');
const HabitLog = require('../models/HabitLog');
const { getTodayDateString, shiftDateString } = require('../utils/dateUtils');
const { recalculateHabitStreaks } = require('./habitLogController');

/**
 * @desc    Record a completed / interrupted Pomodoro session & auto-log linked habit
 * @route   POST /api/pomodoro/sessions
 * @access  Private
 */
const recordSession = async (req, res, next) => {
  try {
    const {
      habitId,
      sessionType = 'focus',
      durationMinutes = 25,
      startTime,
      endTime,
      status = 'completed',
      notes = ''
    } = req.body;

    const start = startTime ? new Date(startTime) : new Date(Date.now() - durationMinutes * 60 * 1000);
    const end = endTime ? new Date(endTime) : new Date();
    const dateString = getTodayDateString();

    // 1. Create the Pomodoro session entry
    const session = await PomodoroSession.create({
      userId: req.user.id,
      habitId: habitId || null,
      sessionType,
      durationMinutes: Number(durationMinutes),
      startTime: start,
      endTime: end,
      status,
      dateString,
      notes
    });

    let updatedHabitLog = null;
    let habitStreakInfo = null;

    // 2. If focus session completed and linked to a habit, auto-update the habit log
    if (status === 'completed' && sessionType === 'focus' && habitId) {
      const habit = await Habit.findOne({ _id: habitId, userId: req.user.id });

      if (habit) {
        const existingLog = await HabitLog.findOne({
          userId: req.user.id,
          habitId: habit._id,
          dateString
        });

        const currentValue = existingLog ? existingLog.value : 0;
        const newValue = currentValue + 1;
        const isCompleted = newValue >= habit.targetValue;

        updatedHabitLog = await HabitLog.findOneAndUpdate(
          {
            userId: req.user.id,
            habitId: habit._id,
            dateString
          },
          {
            value: newValue,
            targetValue: habit.targetValue,
            isCompleted
          },
          {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true
          }
        );

        habitStreakInfo = await recalculateHabitStreaks(habit._id, req.user.id);
      }
    }

    res.status(201).json({
      success: true,
      session,
      linkedHabitUpdated: Boolean(updatedHabitLog),
      habitLog: updatedHabitLog,
      habitStreaks: habitStreakInfo
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user Pomodoro sessions history
 * @route   GET /api/pomodoro/sessions
 * @access  Private
 */
const getSessions = async (req, res, next) => {
  try {
    const { habitId, sessionType, status, startDate, endDate, limit = 50 } = req.query;

    const query = { userId: req.user.id };
    if (habitId) query.habitId = habitId;
    if (sessionType) query.sessionType = sessionType;
    if (status) query.status = status;
    if (startDate && endDate) {
      query.dateString = { $gte: startDate, $lte: endDate };
    }

    const sessions = await PomodoroSession.find(query)
      .populate('habitId', 'title color icon type')
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      count: sessions.length,
      sessions
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Pomodoro focus statistics summary
 * @route   GET /api/pomodoro/stats
 * @access  Private
 */
const getPomodoroStats = async (req, res, next) => {
  try {
    const today = getTodayDateString();
    const sevenDaysAgo = shiftDateString(today, -6);

    // Aggregate total completed focus sessions and minutes
    const overallStats = await PomodoroSession.aggregate([
      {
        $match: {
          userId: req.user._id,
          sessionType: 'focus',
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          totalMinutes: { $sum: '$durationMinutes' }
        }
      }
    ]);

    // Today's stats
    const todayStats = await PomodoroSession.aggregate([
      {
        $match: {
          userId: req.user._id,
          dateString: today,
          sessionType: 'focus',
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          sessionsToday: { $sum: 1 },
          minutesToday: { $sum: '$durationMinutes' }
        }
      }
    ]);

    // Last 7 days stats
    const weeklyStats = await PomodoroSession.aggregate([
      {
        $match: {
          userId: req.user._id,
          dateString: { $gte: sevenDaysAgo, $lte: today },
          sessionType: 'focus',
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$dateString',
          sessionsCount: { $sum: 1 },
          minutesCount: { $sum: '$durationMinutes' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalSessions: overallStats[0]?.totalSessions || 0,
        totalMinutes: overallStats[0]?.totalMinutes || 0,
        sessionsToday: todayStats[0]?.sessionsToday || 0,
        minutesToday: todayStats[0]?.minutesToday || 0,
        last7Days: weeklyStats
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  recordSession,
  getSessions,
  getPomodoroStats
};
