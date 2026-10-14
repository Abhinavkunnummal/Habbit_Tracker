const User = require('../models/User');
const Habit = require('../models/Habit');
const HabitLog = require('../models/HabitLog');
const { getTodayDateString } = require('../utils/dateUtils');

/**
 * @desc Get global & friends streak competition leaderboard
 * @route GET /api/leaderboard
 */
const getLeaderboard = async (req, res, next) => {
  try {
    const today = getTodayDateString();

    // 1. Fetch all real users
    const users = await User.find().select('username displayName avatarUrl');

    // 2. Fetch all active habits to aggregate user streaks
    const habits = await Habit.find({ isArchived: false });
    const todayLogs = await HabitLog.find({ dateString: today, isCompleted: true });

    // Map stats by userId
    const userStats = new Map();

    users.forEach(u => {
      userStats.set(u._id.toString(), {
        id: u._id,
        username: u.username,
        displayName: u.displayName || u.username,
        currentStreak: 0,
        bestStreak: 0,
        habitsCompletedToday: 0,
        totalHabitsCount: 0,
        isCurrentUser: u._id.toString() === req.user.id
      });
    });

    habits.forEach(h => {
      const stats = userStats.get(h.userId.toString());
      if (stats) {
        stats.totalHabitsCount++;
        if (h.currentStreak > stats.currentStreak) {
          stats.currentStreak = h.currentStreak;
        }
        if (h.bestStreak > stats.bestStreak) {
          stats.bestStreak = h.bestStreak;
        }
      }
    });

    todayLogs.forEach(l => {
      const stats = userStats.get(l.userId.toString());
      if (stats) {
        stats.habitsCompletedToday++;
      }
    });

    let leaderboard = Array.from(userStats.values());

    // 3. If community is small, add competitive friend bots
    if (leaderboard.length < 5) {
      const mockFriends = [
        {
          id: 'bot_1',
          username: 'alex_flow',
          displayName: 'Alex Rivers',
          currentStreak: 18,
          bestStreak: 24,
          habitsCompletedToday: 4,
          totalHabitsCount: 5,
          isCurrentUser: false
        },
        {
          id: 'bot_2',
          username: 'sarah_code',
          displayName: 'Sarah Chen',
          currentStreak: 12,
          bestStreak: 19,
          habitsCompletedToday: 3,
          totalHabitsCount: 4,
          isCurrentUser: false
        },
        {
          id: 'bot_3',
          username: 'dev_marcus',
          displayName: 'Marcus Vance',
          currentStreak: 7,
          bestStreak: 14,
          habitsCompletedToday: 2,
          totalHabitsCount: 3,
          isCurrentUser: false
        },
        {
          id: 'bot_4',
          username: 'elena_focus',
          displayName: 'Elena Rostova',
          currentStreak: 5,
          bestStreak: 9,
          habitsCompletedToday: 3,
          totalHabitsCount: 4,
          isCurrentUser: false
        }
      ];

      leaderboard.push(...mockFriends);
    }

    // Sort descending by currentStreak, then habitsCompletedToday
    leaderboard.sort((a, b) => {
      if (b.currentStreak !== a.currentStreak) {
        return b.currentStreak - a.currentStreak;
      }
      return b.habitsCompletedToday - a.habitsCompletedToday;
    });

    // Assign ranking numbers
    leaderboard = leaderboard.map((item, idx) => ({
      rank: idx + 1,
      ...item
    }));

    const currentUserRank = leaderboard.find(u => u.isCurrentUser)?.rank || 1;

    res.status(200).json({
      success: true,
      currentUserRank,
      totalCompetitors: leaderboard.length,
      leaderboard
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLeaderboard
};
