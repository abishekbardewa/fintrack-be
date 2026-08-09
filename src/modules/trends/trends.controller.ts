import type { Request, Response } from 'express';
import { messages } from '../../config/messages.js';
import { AppError } from '../../shared/errors/AppError.js';
import { catchAsync } from '../../shared/middleware/catchAsync.js';
import { sendSuccess } from '../../shared/response/apiResponse.js';
import * as trendsService from './trends.service.js';
import type { GetTrendsQuery } from './trends.validation.js';

export const getTrends = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) {
		throw new AppError(messages.TOKEN_INVALID, 401);
	}
	const query = req.query as unknown as GetTrendsQuery;
	const data = await trendsService.getTrends(req.user.userId, query);
	sendSuccess({
		res,
		statusCode: 200,
		message: 'Success',
		data,
	});
});
