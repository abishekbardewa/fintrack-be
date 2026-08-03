import type { Request, Response } from 'express';
import { logger } from '../../config/logger.js';
import { catchAsync } from '../../shared/middleware/catchAsync.js';
import { sendSuccess } from '../../shared/response/apiResponse.js';
import * as authService from './auth.service.js';
import type { LoginBody, RegisterBody } from './auth.validation.js';

export const register = catchAsync(async (req: Request, res: Response) => {
	logger.info('Register user');
	const body = req.body as RegisterBody;
	const user = await authService.registerUser(body);
	sendSuccess({
		res,
		statusCode: 201,
		message: 'Account created successfully',
		data: { user },
	});
});

export const login = catchAsync(async (req: Request, res: Response) => {
	logger.info('Login user');
	const body = req.body as LoginBody;
	const result = await authService.loginUser(body);
	sendSuccess({
		res,
		statusCode: 200,
		message: 'Login successful',
		data: result,
	});
});
