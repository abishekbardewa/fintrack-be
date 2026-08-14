import type { Request, Response } from 'express';
import { messages } from '../../config/messages.js';
import { AppError } from '../../shared/errors/AppError.js';
import { catchAsync } from '../../shared/middleware/catchAsync.js';
import { sendSuccess } from '../../shared/response/apiResponse.js';
import * as userService from './user.service.js';
import type { ChangePasswordBody, UpdateMeBody } from './user.validation.js';

export const getMe = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) {
		throw new AppError(messages.TOKEN_INVALID, 401);
	}
	const user = await userService.getMe(req.user.userId);
	sendSuccess({
		res,
		statusCode: 200,
		message: 'Success',
		data: { user },
	});
});

export const updateMe = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) {
		throw new AppError(messages.TOKEN_INVALID, 401);
	}
	const body = req.body as UpdateMeBody;
	const user = await userService.updateMe(req.user.userId, body);
	sendSuccess({
		res,
		statusCode: 200,
		message: messages.PROFILE_UPDATED,
		data: { user },
	});
});

export const updateAvatar = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) {
		throw new AppError(messages.TOKEN_INVALID, 401);
	}
	if (!req.file) {
		throw new AppError(messages.AVATAR_FILE_REQUIRED, 422);
	}
	const user = await userService.updateAvatar(req.user.userId, req.file.buffer);
	sendSuccess({
		res,
		statusCode: 200,
		message: messages.AVATAR_UPDATED,
		data: { user },
	});
});

export const changePassword = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) {
		throw new AppError(messages.TOKEN_INVALID, 401);
	}
	const body = req.body as ChangePasswordBody;
	await userService.changePassword(req.user.userId, body);
	sendSuccess({
		res,
		statusCode: 200,
		message: messages.PASSWORD_UPDATED,
		data: null,
	});
});
