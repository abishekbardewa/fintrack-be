import { timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { config } from '../../config/env.js';
import { messages } from '../../config/messages.js';
import { AppError } from '../errors/AppError.js';

function secretsMatch(provided: string, expected: string): boolean {
	const a = Buffer.from(provided);
	const b = Buffer.from(expected);
	if (a.length !== b.length) {
		return false;
	}
	return timingSafeEqual(a, b);
}

export const requireCronSecret = (req: Request, _res: Response, next: NextFunction): void => {
	const expected = config.cron.secret;
	if (!expected) {
		next(new AppError(messages.CRON_SECRET_MISSING, 503));
		return;
	}

	const provided = req.header('x-cron-secret')?.trim();
	if (!provided || !secretsMatch(provided, expected)) {
		next(new AppError(messages.CRON_SECRET_INVALID, 401));
		return;
	}

	next();
};
