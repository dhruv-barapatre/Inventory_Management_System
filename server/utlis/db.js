const mongoose = require('mongoose');

const mongoURI = 'mongodb://127.0.0.1:27017/my_database';

async function connectDB() {
    try {
        await mongoose.connect(mongoURI);
        console.log('✅ MongoDB Connected Successfully!');
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        process.exit(1);
    }
}

module.exports = connectDB;
