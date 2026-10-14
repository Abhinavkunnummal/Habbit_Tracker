const Habit = require('../models/Habit');
const HabitLog = require('../models/HabitLog');
const PlannerItem = require('../models/PlannerItem');
const TodoItem = require('../models/TodoItem');
const ExpenseItem = require('../models/ExpenseItem');
const ScreenTimeLog = require('../models/ScreenTimeLog');
const PomodoroSession = require('../models/PomodoroSession');
const { getTodayDateString } = require('../utils/dateUtils');

/**
 * @desc Get complete day hub data: Habits, Schedule, To-Dos, Expenses, Screen Time & Productivity Score
 * @route GET /api/calendar/day
 */
const getDaySummary = async (req, res, next) => {
  try {
    const { date } = req.query;
    const targetDate = date || getTodayDateString();

    const [
      habits,
      habitLogs,
      plannerItems,
      todos,
      expenses,
      screenTime,
      pomodoroSessions
    ] = await Promise.all([
      Habit.find({ userId: req.user.id, isArchived: false }),
      HabitLog.find({ userId: req.user.id, dateString: targetDate }),
      PlannerItem.find({ userId: req.user.id, dateString: targetDate }).sort({ startTime: 1 }),
      TodoItem.find({ userId: req.user.id, dateString: targetDate }),
      ExpenseItem.find({ userId: req.user.id, dateString: targetDate }),
      ScreenTimeLog.findOne({ userId: req.user.id, dateString: targetDate }),
      PomodoroSession.find({ userId: req.user.id, dateString: targetDate, status: 'completed' })
    ]);

    // 1. Habit Completion Rate
    const totalHabits = habits.length;
    const completedHabits = habitLogs.filter(l => l.isCompleted).length;
    const habitRate = totalHabits > 0 ? (completedHabits / totalHabits) : 0;

    // 2. To-Do Completion Rate
    const totalTodos = todos.length;
    const completedTodos = todos.filter(t => t.isCompleted).length;
    const todoRate = totalTodos > 0 ? (completedTodos / totalTodos) : 1;

    // 3. Focus Sessions
    const totalFocusMinutes = pomodoroSessions.reduce((acc, s) => acc + s.durationMinutes, 0);

    // 4. Expenses Total
    const totalExpenseAmount = expenses.reduce((acc, e) => acc + e.amount, 0);

    // 5. Screen Time
    const screenMinutes = screenTime ? screenTime.totalMinutes : 0;
    const productiveScreenMinutes = screenTime ? screenTime.productiveMinutes : 0;

    // 6. Productivity Score Calculation (0 - 100)
    // Formula: 40% habits + 30% todos + 20% pomodoro (target 50m) + 10% productive screen ratio
    let score = 0;
    if (totalHabits > 0) score += Math.round(habitRate * 40);
    else score += 40;

    if (totalTodos > 0) score += Math.round(todoRate * 30);
    else score += 30;

    const pomoFactor = Math.min(1, totalFocusMinutes / 50);
    score += Math.round(pomoFactor * 20);

    if (screenMinutes > 0) {
      const prodRatio = productiveScreenMinutes / screenMinutes;
      score += Math.round(prodRatio * 10);
    } else {
      score += 10;
    }

    score = Math.min(100, Math.max(0, score));

    res.status(200).json({
      success: true,
      targetDate,
      productivityScore: score,
      summary: {
        habits: {
          total: totalHabits,
          completed: completedHabits,
          percentage: totalHabits > 0 ? Math.round(habitRate * 100) : 0
        },
        todos: {
          total: totalTodos,
          completed: completedTodos,
          percentage: totalTodos > 0 ? Math.round(todoRate * 100) : 0
        },
        pomodoro: {
          sessionsCount: pomodoroSessions.length,
          totalFocusMinutes
        },
        expenses: {
          count: expenses.length,
          totalAmount: totalExpenseAmount
        },
        screenTime: {
          totalMinutes: screenMinutes,
          productiveMinutes: productiveScreenMinutes
        }
      },
      plannerItems,
      todos,
      expenses,
      screenTime: screenTime || {
        dateString: targetDate,
        totalMinutes: 0,
        productiveMinutes: 0,
        entertainmentMinutes: 0
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDaySummary
};
