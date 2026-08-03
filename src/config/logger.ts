import winston from 'winston';
import { config } from './env.js';

const { combine, timestamp, json, colorize, printf, errors } = winston.format;

const consoleFormat = combine(
	colorize(),
	timestamp(),
	errors({ stack: true }),
	printf(({ level, message, timestamp: ts, stack, ...meta }) => {
		const rest = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
		return stack ? `${ts} ${level}: ${message}${rest}\n${stack}` : `${ts} ${level}: ${message}${rest}`;
	}),
);

export const logger = winston.createLogger({
	level: config.isDevelopment ? 'debug' : 'info',
	format: combine(timestamp(), errors({ stack: true }), json()),
	defaultMeta: { service: 'fintrack-be' },
	transports: [
		new winston.transports.Console({
			format: config.isDevelopment ? consoleFormat : combine(timestamp(), json()),
		}),
	],
	exitOnError: false,
});
