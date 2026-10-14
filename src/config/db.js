const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/habit_tracker_db';
    const isAtlas = uri.includes('mongodb.net') || uri.startsWith('mongodb+srv');
    
    console.log(`[MongoDB] Connecting to ${isAtlas ? 'MongoDB Atlas (Cloud)' : 'Local MongoDB'}...`);
    
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
    });
    
    console.log(`[MongoDB] Successfully Connected to ${conn.connection.host} (${conn.connection.name})`);
  } catch (error) {
    console.error(`[MongoDB] Connection Failed: ${error.message}`);
    console.error(`[MongoDB] Tip: If using MongoDB Atlas, check:`);
    console.error(`  1. IP Access List in Atlas Network Access (set to 0.0.0.0/0 for testing)`);
    console.error(`  2. Database user username and password in .env`);
    // Do not crash server immediately if offline, allow static PWA to serve
  }
};

module.exports = connectDB;
