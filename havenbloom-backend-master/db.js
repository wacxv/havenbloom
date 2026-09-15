const mongoose = require('mongoose');

const connectToDb = async (callback) => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    });
    console.log('Connected to MongoDB');
    callback();
  } catch (error) {
    console.error('MongoDB connection error:', error);
    callback(error);
  }
};

module.exports = { connectToDb };
