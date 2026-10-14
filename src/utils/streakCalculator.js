const {
  getTodayDateString,
  getYesterdayDateString,
  shiftDateString
} = require('./dateUtils');

/**
 * Calculates current streak and best streak from an array of completed date strings ('YYYY-MM-DD').
 * 
 * Rules:
 * - Current streak:
 *   If completed today: streak counts backwards consecutively from today.
 *   If not completed today but completed yesterday: streak is still alive, counts backwards from yesterday.
 *   If last completion was prior to yesterday: streak is broken (0).
 * 
 * - Best streak:
 *   The longest sequence of consecutive days with completions historically.
 * 
 * @param {string[]} completedDates Array of 'YYYY-MM-DD' strings where the habit was completed.
 * @returns {{ currentStreak: number, bestStreak: number }}
 */
const calculateStreaks = (completedDates = []) => {
  if (!completedDates || completedDates.length === 0) {
    return { currentStreak: 0, bestStreak: 0 };
  }

  // Deduplicate and filter valid 'YYYY-MM-DD' strings
  const uniqueDates = Array.from(new Set(completedDates.filter(d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))));
  
  if (uniqueDates.length === 0) {
    return { currentStreak: 0, bestStreak: 0 };
  }

  // Sort ascending for best streak calculation
  uniqueDates.sort((a, b) => a.localeCompare(b));

  // 1. Calculate Best Streak historically
  let bestStreak = 1;
  let tempStreak = 1;

  for (let i = 1; i < uniqueDates.length; i++) {
    const prevDate = uniqueDates[i - 1];
    const expectedNext = shiftDateString(prevDate, 1);

    if (uniqueDates[i] === expectedNext) {
      tempStreak++;
    } else {
      tempStreak = 1;
    }

    if (tempStreak > bestStreak) {
      bestStreak = tempStreak;
    }
  }

  // 2. Calculate Current Streak
  const today = getTodayDateString();
  const yesterday = getYesterdayDateString();

  const datesSet = new Set(uniqueDates);
  let currentStreak = 0;

  // Determine starting point for current streak
  let checkDate = null;
  if (datesSet.has(today)) {
    checkDate = today;
  } else if (datesSet.has(yesterday)) {
    checkDate = yesterday;
  }

  if (checkDate) {
    // Count consecutive days backward
    while (datesSet.has(checkDate)) {
      currentStreak++;
      checkDate = shiftDateString(checkDate, -1);
    }
  }

  // Ensure bestStreak is at least currentStreak
  if (currentStreak > bestStreak) {
    bestStreak = currentStreak;
  }

  return { currentStreak, bestStreak };
};

module.exports = {
  calculateStreaks
};
