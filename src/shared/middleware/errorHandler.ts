import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { config } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { messages } from '../../config/messages.js';
import { AppError } from '../errors/AppError.js';
import { sendError } from '../response/apiResponse.js';

function mapMongooseError(err: unknown): AppError | null {
	if (err instanceof mongoose.Error.CastError) {
		return new AppError(`Invalid ${err.path}: ${String(err.value)}`, 400);
	}

	if (err instanceof mongoose.Error.ValidationError) {
		return new AppError(
			messages.VALIDATION_FAILED,
			422,
			Object.values(err.errors).map((e) => ({
				field: e.path,
				message: e.message,
			})),
		);
	}

	if (typeof err === 'object' && err !== null && 'code' in err && (err as { code?: number }).code === 11000) {
		return new AppError(messages.USER_ALREADY_EXISTS, 409);
	}

	return null;
}

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
	next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
	const mapped = mapMongooseError(err);
	const error = mapped ?? (err instanceof AppError ? err : null);

	if (error) {
		if (!config.isProduction) {
			logger.error(error.message, { stack: error.stack, details: error.details });
		} else if (!error.isOperational) {
			logger.error(error);
		}

		sendError({
			res,
			statusCode: error.statusCode,
			message: error.message,
			details: error.details,
		});
		return;
	}

	logger.error('Unhandled error', { err });

	sendError({
		res,
		statusCode: 500,
		message: config.isProduction ? messages.SOMETHING_WENT_WRONG : err instanceof Error ? err.message : messages.SOMETHING_WENT_WRONG,
	});
}
