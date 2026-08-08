import rateLimit from 'express-rate-limit';

export const defaultLimiter = rateLimit({
	windowMs: 60 * 1000,
	max: 100,
	standardHeaders: true,
	legacyHeaders: false,
	message: { success: false, statusCode: 429, message: 'Too many requests, please try again later' },
});

export const apiLimiter = rateLimit({
	windowMs: 5 * 60 * 1000,
	max: 100,
	standardHeaders: true,
	legacyHeaders: false,
	message: { success: false, statusCode: 429, message: 'Too many API requests, please try again later' },
});

export const createAccountLimiter = rateLimit({
	windowMs: 60 * 60 * 1000,
	max: 5,
	standardHeaders: true,
	legacyHeaders: false,
	message: {
		success: false,
		statusCode: 429,
		message: 'Too many accounts created from this IP, please try again after an hour',
	},
});

export const importTransactionsLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 20,
	standardHeaders: true,
	legacyHeaders: false,
	message: {
		success: false,
		statusCode: 429,
		message: 'Too many import requests, please try again later',
	},
});
