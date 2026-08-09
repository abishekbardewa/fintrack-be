import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '../../config/enums.js';
import { config } from '../../config/env.js';
import { messages } from '../../config/messages.js';
import type { AccessTokenPayload } from '../../types/auth.js';
import { AppError } from '../errors/AppError.js';

export const requireAuth = (req: Request, _res: Response, next: NextFunction): void => {
	const authHeader = req.headers.authorization;

	if (!authHeader?.startsWith('Bearer ')) {
		next(new AppError(messages.TOKEN_MISSING, 401));
		return;
	}

	const token = authHeader.slice('Bearer '.length).trim();
	if (!token) {
		next(new AppError(messages.TOKEN_MISSING, 401));
		return;
	}

	try {
		const decoded = jwt.verify(token, config.jwt.secret) as AccessTokenPayload;
		req.user = {
			userId: decoded.userId,
			email: decoded.email,
			name: decoded.name,
			role: decoded.role ?? UserRole.User,
		};
		next();
	} catch {
		next(new AppError(messages.TOKEN_INVALID, 401));
	}
};

export const requireAdmin = (req: Request, _res: Response, next: NextFunction): void => {
	if (!req.user?.userId) {
		next(new AppError(messages.TOKEN_INVALID, 401));
		return;
	}
	if (req.user.role !== UserRole.Admin) {
		next(new AppError(messages.ADMIN_REQUIRED, 403));
		return;
	}
	next();
};
