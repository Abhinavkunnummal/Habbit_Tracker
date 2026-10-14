const express = require('express');
const {
  getTodos,
  createTodo,
  toggleTodo,
  deleteTodo
} = require('../controllers/todoController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/', getTodos);
router.post('/', createTodo);
router.patch('/:id/toggle', toggleTodo);
router.delete('/:id', deleteTodo);

module.exports = router;
