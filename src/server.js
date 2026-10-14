require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

// Connect to MongoDB
connectDB();

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`=========================================`);
  console.log(` Habit Tracker Server is running!`);
  console.log(` Laptop URL  : http://localhost:${PORT}`);
  console.log(` Mobile URL  : http://192.168.1.3:${PORT}`);
  console.log(` Health      : http://localhost:${PORT}/api/health`);
  console.log(`=========================================`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`Unhandled Rejection Error: ${err.message}`);
  // In production, consider graceful shutdown: server.close(() => process.exit(1));
});

module.exports = server;
