import mongoose from 'mongoose';

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/kaveri-db';

export async function connectDB() {
    try {
        await mongoose.connect(mongoUri);
        console.log('✓ MongoDB connected successfully');
    } catch (error) {
        console.error('✗ MongoDB connection failed:', error);
        process.exit(1);
    }
}

export function disconnectDB() {
    mongoose.disconnect();
}

export default mongoose;
