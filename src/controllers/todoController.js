const TodoItem = require('../models/TodoItem');
const { getTodayDateString } = require('../utils/dateUtils');

/**
 * @desc Get daily to-do items for a date
 * @route GET /api/todos
 */
const getTodos = async (req, res, next) => {
  try {
    const { date } = req.query;
    const targetDate = date || getTodayDateString();

    const todos = await TodoItem.find({
      userId: req.user.id,
      dateString: targetDate
    }).sort({ isCompleted: 1, createdAt: -1 });

    res.status(200).json({
      success: true,
      targetDate,
      count: todos.length,
      todos
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Create a new to-do task
 * @route POST /api/todos
 */
const createTodo = async (req, res, next) => {
  try {
    const { title, dateString, priority, category } = req.body;

    const todo = await TodoItem.create({
      userId: req.user.id,
      title,
      dateString: dateString || getTodayDateString(),
      priority: priority || 'medium',
      category: category || 'General'
    });

    res.status(201).json({
      success: true,
      todo
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Toggle to-do completion status
 * @route PATCH /api/todos/:id/toggle
 */
const toggleTodo = async (req, res, next) => {
  try {
    const todo = await TodoItem.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!todo) {
      return res.status(404).json({ success: false, message: 'Todo not found' });
    }

    todo.isCompleted = !todo.isCompleted;
    await todo.save();

    res.status(200).json({ success: true, todo });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Delete a to-do
 * @route DELETE /api/todos/:id
 */
const deleteTodo = async (req, res, next) => {
  try {
    const todo = await TodoItem.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!todo) {
      return res.status(404).json({ success: false, message: 'Todo not found' });
    }

    res.status(200).json({ success: true, message: 'Todo deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTodos,
  createTodo,
  toggleTodo,
  deleteTodo
};
