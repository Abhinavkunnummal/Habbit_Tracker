const { calculateStreaks } = require('./src/utils/streakCalculator');
const { getTodayDateString, getYesterdayDateString, shiftDateString } = require('./src/utils/dateUtils');
const app = require('./src/app');

console.log('Testing App import: SUCCESS (app loaded properly)');

const today = getTodayDateString();
const yesterday = getYesterdayDateString();
const twoDaysAgo = shiftDateString(today, -2);
const threeDaysAgo = shiftDateString(today, -3);

// Test 1: Active streak ending today
const testDates1 = [threeDaysAgo, twoDaysAgo, yesterday, today];
const res1 = calculateStreaks(testDates1);
console.log('Test 1 (Active streak ending today):', res1);
if (res1.currentStreak !== 4 || res1.bestStreak !== 4) {
  throw new Error(`Test 1 Failed: expected 4/4, got ${res1.currentStreak}/${res1.bestStreak}`);
}

// Test 2: Active streak ending yesterday (not completed today yet)
const testDates2 = [threeDaysAgo, twoDaysAgo, yesterday];
const res2 = calculateStreaks(testDates2);
console.log('Test 2 (Active streak ending yesterday):', res2);
if (res2.currentStreak !== 3 || res2.bestStreak !== 3) {
  throw new Error(`Test 2 Failed: expected 3/3, got ${res2.currentStreak}/${res2.bestStreak}`);
}

// Test 3: Broken streak (last completed 2 days ago)
const testDates3 = [threeDaysAgo, twoDaysAgo];
const res3 = calculateStreaks(testDates3);
console.log('Test 3 (Broken streak):', res3);
if (res3.currentStreak !== 0 || res3.bestStreak !== 2) {
  throw new Error(`Test 3 Failed: expected 0/2, got ${res3.currentStreak}/${res3.bestStreak}`);
}

// Test 4: Historical best streak > current streak
const tenDaysAgo = shiftDateString(today, -10);
const nineDaysAgo = shiftDateString(today, -9);
const eightDaysAgo = shiftDateString(today, -8);
const sevenDaysAgo = shiftDateString(today, -7);
const sixDaysAgo = shiftDateString(today, -6);
// Historical streak of 5 days, current streak of 2 days
const testDates4 = [tenDaysAgo, nineDaysAgo, eightDaysAgo, sevenDaysAgo, sixDaysAgo, yesterday, today];
const res4 = calculateStreaks(testDates4);
console.log('Test 4 (Historical best streak):', res4);
if (res4.currentStreak !== 2 || res4.bestStreak !== 5) {
  throw new Error(`Test 4 Failed: expected 2/5, got ${res4.currentStreak}/${res4.bestStreak}`);
}

console.log('====================================');
console.log('ALL BACKEND INTEGRATION & UTILITY TESTS PASSED!');
console.log('====================================');
process.exit(0);

