const ScreenTimeLog = require('../models/ScreenTimeLog');
const { getTodayDateString } = require('../utils/dateUtils');

/**
 * @desc Get screen time record for a date
 * @route GET /api/screentime
 */
const getScreenTime = async (req, res, next) => {
  try {
    const { date } = req.query;
    const targetDate = date || getTodayDateString();

    const log = await ScreenTimeLog.findOne({
      userId: req.user.id,
      dateString: targetDate
    });

    res.status(200).json({
      success: true,
      targetDate,
      log: log || {
        dateString: targetDate,
        totalMinutes: 0,
        productiveMinutes: 0,
        entertainmentMinutes: 0,
        notes: ''
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Log or update daily screen time
 * @route POST /api/screentime
 */
const logScreenTime = async (req, res, next) => {
  try {
    const {
      dateString,
      totalMinutes,
      productiveMinutes,
      entertainmentMinutes,
      notes
    } = req.body;

    const targetDate = dateString || getTodayDateString();

    const log = await ScreenTimeLog.findOneAndUpdate(
      {
        userId: req.user.id,
        dateString: targetDate
      },
      {
        totalMinutes: Number(totalMinutes) || 0,
        productiveMinutes: Number(productiveMinutes) || 0,
        entertainmentMinutes: Number(entertainmentMinutes) || 0,
        notes: notes || ''
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      }
    );

    res.status(200).json({
      success: true,
      log
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getScreenTime,
  logScreenTime
};
