const Habit = require('../models/Habit');
const HabitLog = require('../models/HabitLog');
const {
  getTodayDateString,
  shiftDateString,
  generateDateRange
} = require('../utils/dateUtils');
const { calculateStreaks } = require('../utils/streakCalculator');

// GitHub Dark Theme Heatmap Color Palette
const HEATMAP_COLORS = {
  0: '#161b22', // Empty card background
  1: '#0e4429', // Low intensity (1 - 25%)
  2: '#006d32', // Medium-low intensity (26 - 50%)
  3: '#26a641', // Medium-high intensity (51 - 75%)
  4: '#39d353'  // Max intensity neon green (76 - 100%)
};

/**
 * Determine heatmap level (0 - 4) based on completion percentage.
 * @param {number} percentage 0 to 100
 * @returns {number} Level 0 to 4
 */
const getIntensityLevel = (percentage) => {
  if (percentage <= 0) return 0;
  if (percentage <= 25) return 1;
  if (percentage <= 50) return 2;
  if (percentage <= 75) return 3;
  return 4;
};

/**
 * @desc    Get GitHub-style contribution heatmap grid data & statistics
 * @route   GET /api/heatmap
 * @access  Private
 */
const getHeatmapData = async (req, res, next) => {
  try {
    const { startDate, endDate, habitId } = req.query;

    const end = endDate || getTodayDateString();
    const start = startDate || shiftDateString(end, -364); // Default to past 365 calendar days

    // Generate complete contiguous date array for the range
    const allDates = generateDateRange(start, end);

    let habitFilter = null;
    if (habitId) {
      habitFilter = await Habit.findOne({ _id: habitId, userId: req.user.id });
      if (!habitFilter) {
        return res.status(404).json({
          success: false,
          message: 'Specified habit not found'
        });
      }
    }

    // 1. Fetch user habits to know active count
    const activeHabits = await Habit.find({
      userId: req.user.id,
      isArchived: false
    });
    const totalActiveHabitsCount = activeHabits.length;

    // 2. Fetch logs within the date range
    const logQuery = {
      userId: req.user.id,
      dateString: { $gte: start, $lte: end }
    };
    if (habitId) {
      logQuery.habitId = habitId;
    }

    const logs = await HabitLog.find(logQuery).select(
      'habitId dateString value targetValue isCompleted'
    );

    // Group logs by date
    const logsByDate = new Map();
    logs.forEach(log => {
      if (!logsByDate.has(log.dateString)) {
        logsByDate.set(log.dateString, []);
      }
      logsByDate.get(log.dateString).push(log);
    });

    let totalContributions = 0;
    let activeDays = 0;
    let maxDailyCompletions = 0;
    const completedDaysSet = new Set();

    // 3. Construct continuous heatmap grid
    const heatmap = allDates.map(date => {
      const dayLogs = logsByDate.get(date) || [];
      
      let completedCount = 0;
      let percentage = 0;
      let level = 0;

      if (habitId && habitFilter) {
        // Single Habit View
        const log = dayLogs[0];
        if (log) {
          if (log.isCompleted) {
            completedCount = 1;
            percentage = 100;
          } else if (log.targetValue > 0) {
            percentage = Math.min(100, Math.round((log.value / log.targetValue) * 100));
          }
        }
        level = getIntensityLevel(percentage);
      } else {
        // Overall All Habits View
        completedCount = dayLogs.filter(l => l.isCompleted).length;
        const totalPossible = totalActiveHabitsCount > 0 ? totalActiveHabitsCount : 1;
        percentage = totalActiveHabitsCount > 0
          ? Math.min(100, Math.round((completedCount / totalPossible) * 100))
          : 0;

        level = getIntensityLevel(percentage);
      }

      if (completedCount > 0) {
        totalContributions += completedCount;
        activeDays++;
        completedDaysSet.add(date);
        if (completedCount > maxDailyCompletions) {
          maxDailyCompletions = completedCount;
        }
      }

      return {
        date,
        count: completedCount,
        totalHabits: habitId ? 1 : totalActiveHabitsCount,
        percentage,
        level,
        color: HEATMAP_COLORS[level]
      };
    });

    // 4. Calculate overall continuous streaks across all habits
    const overallStreak = calculateStreaks(Array.from(completedDaysSet));

    res.status(200).json({
      success: true,
      startDate: start,
      endDate: end,
      totalDays: heatmap.length,
      habitId: habitId || null,
      summary: {
        totalContributions,
        activeDays,
        maxDailyCompletions,
        currentStreak: overallStreak.currentStreak,
        bestStreak: overallStreak.bestStreak,
        completionRatePercentage: activeDays > 0 ? Math.round((activeDays / heatmap.length) * 100) : 0
      },
      heatmap
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getHeatmapData,
  HEATMAP_COLORS
};
