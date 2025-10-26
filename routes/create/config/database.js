import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    // Support both MONGODB_URI (full URI) and separate components for Kubernetes
    let mongoUri;

    if (process.env.MONGODB_URI || process.env.MONGO_URI) {
      mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    } else if (process.env.MONGODB_HOST) {
      // Construct URI from separate environment variables (Kubernetes pattern)
      const host = process.env.MONGODB_HOST || 'localhost';
      const port = process.env.MONGODB_PORT || '27017';
      const username = process.env.MONGODB_USERNAME || 'tlef-app';
      const password = process.env.MONGODB_PASSWORD || 'tlef-app-2024';
      const database = process.env.MONGODB_DATABASE || 'tlef-create';
      // IMPORTANT: authSource=admin is required for root users in MongoDB
      mongoUri = `mongodb://${username}:${password}@${host}:${port}/${database}?authSource=admin`;
    } else {
      // Default for local development (assumes local MongoDB with same auth pattern)
      mongoUri = 'mongodb://tlef-app:tlef-app-2024@localhost:27017/tlef-create?authSource=admin';
    }
    const conn = await mongoose.connect(mongoUri, {
      // Mongoose 7+ doesn't need most options as they're defaults
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      family: 4 // Use IPv4, skip trying IPv6
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Initialize job queue after MongoDB connection
    try {
      const { default: jobQueueService } = await import('../services/jobQueueService.js');
      await jobQueueService.initialize();
      
      // Start SSE heartbeat
      const { default: sseService } = await import('../services/sseService.js');
      sseService.startHeartbeat();
      
    } catch (jobQueueError) {
      console.error('❌ Failed to initialize job queue:', jobQueueError);
      // Don't exit - let the app run without job queue for now
    }
    
    // Listen for connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('🔴 MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
};

export default connectDB;