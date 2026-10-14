const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/authRoutes');
const habitRoutes = require('./routes/habitRoutes');
const habitLogRoutes = require('./routes/habitLogRoutes');
const pomodoroRoutes = require('./routes/pomodoroRoutes');
const heatmapRoutes = require('./routes/heatmapRoutes');
const plannerRoutes = require('./routes/plannerRoutes');
const todoRoutes = require('./routes/todoRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const screenTimeRoutes = require('./routes/screenTimeRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const calendarRoutes = require('./routes/calendarRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const path = require('path');

const app = express();

// Security HTTP headers (configured for static assets & PWA)
app.use(helmet({
  contentSecurityPolicy: false
}));

// Enable CORS for mobile/web clients
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Serve Mobile Web App from public folder with fresh updates
app.use(express.static(path.join(__dirname, '../public'), {
  etag: false,
  maxAge: 0,
  setHeaders: (res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  }
}));

// Request body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP request logger
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/logs', habitLogRoutes);
app.use('/api/pomodoro', pomodoroRoutes);
app.use('/api/heatmap', heatmapRoutes);
app.use('/api/planner', plannerRoutes);
app.use('/api/todos', todoRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/screentime', screenTimeRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/calendar', calendarRoutes);

// 404 & Centralized Error Handlers
app.use(notFound);
app.use(errorHandler);

module.exports = app;
