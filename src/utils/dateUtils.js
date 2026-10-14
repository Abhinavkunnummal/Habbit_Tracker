/**
 * Date utility helpers for Habit Tracking and Heatmap operations.
 * Operates on standardized 'YYYY-MM-DD' calendar strings.
 */

/**
 * Format a Date object or timestamp to 'YYYY-MM-DD'.
 * @param {Date|string|number} date
 * @returns {string} 'YYYY-MM-DD'
 */
const formatDateString = (date = new Date()) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get today's date formatted as 'YYYY-MM-DD'.
 * @returns {string}
 */
const getTodayDateString = () => {
  return formatDateString(new Date());
};

/**
 * Get yesterday's date formatted as 'YYYY-MM-DD'.
 * @returns {string}
 */
const getYesterdayDateString = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatDateString(d);
};

/**
 * Shift a 'YYYY-MM-DD' string by a given number of days.
 * @param {string} dateStr 'YYYY-MM-DD'
 * @param {number} daysCount Can be positive or negative
 * @returns {string} 'YYYY-MM-DD'
 */
const shiftDateString = (dateStr, daysCount) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + daysCount);
  return formatDateString(d);
};

/**
 * Calculate difference in calendar days between two 'YYYY-MM-DD' strings (d2 - d1).
 * @param {string} dateStr1 'YYYY-MM-DD'
 * @param {string} dateStr2 'YYYY-MM-DD'
 * @returns {number} Difference in days
 */
const diffInDays = (dateStr1, dateStr2) => {
  const [y1, m1, d1] = dateStr1.split('-').map(Number);
  const [y2, m2, d2] = dateStr2.split('-').map(Number);
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((utc2 - utc1) / msPerDay);
};

/**
 * Generate an ordered array of continuous 'YYYY-MM-DD' strings between startDate and endDate.
 * @param {string} startDateStr 'YYYY-MM-DD'
 * @param {string} endDateStr 'YYYY-MM-DD'
 * @returns {string[]}
 */
const generateDateRange = (startDateStr, endDateStr) => {
  const dates = [];
  let current = startDateStr;
  while (current <= endDateStr) {
    dates.push(current);
    current = shiftDateString(current, 1);
  }
  return dates;
};

/**
 * Get the date string for N days ago.
 * @param {number} days
 * @returns {string}
 */
const getDaysAgoDateString = (days) => {
  return shiftDateString(getTodayDateString(), -days);
};

module.exports = {
  formatDateString,
  getTodayDateString,
  getYesterdayDateString,
  shiftDateString,
  diffInDays,
  generateDateRange,
  getDaysAgoDateString
};
