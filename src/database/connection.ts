import mongoose from 'mongoose';
import { config } from '../config/env.js';
import { logger } from '../config/logger.js';

export async function connectDatabase(): Promise<typeof mongoose> {
	mongoose.connection.on('connected', () => {
		logger.info('MongoDB connected');
	});

	mongoose.connection.on('error', (err) => {
		logger.error('MongoDB connection error', { err });
	});

	mongoose.connection.on('disconnected', () => {
		logger.warn('MongoDB disconnected');
	});

	await mongoose.connect(config.db.uri);
	return mongoose;
}

export async function disconnectDatabase(): Promise<void> {
	await mongoose.connection.close();
	logger.info('MongoDB connection closed');
}
