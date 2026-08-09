import type { Request, Response } from 'express';
import { messages } from '../../config/messages.js';
import { AppError } from '../../shared/errors/AppError.js';
import { catchAsync } from '../../shared/middleware/catchAsync.js';
import { sendSuccess } from '../../shared/response/apiResponse.js';
import * as adminExchangeRateService from './admin-exchange-rate.service.js';
import type {
	CreateExchangeRateBody,
	ListExchangeRatesQuery,
	ListFxSyncLogsQuery,
	UpdateExchangeRateBody,
} from './exchange-rate.validation.js';

function requireAdminUser(req: Request): string {
	if (!req.user?.userId) {
		throw new AppError(messages.TOKEN_INVALID, 401);
	}
	return req.user.userId;
}

export const listExchangeRates = catchAsync(async (req: Request, res: Response) => {
	requireAdminUser(req);
	const query = req.query as unknown as ListExchangeRatesQuery;
	const data = await adminExchangeRateService.listExchangeRates(query);
	sendSuccess({ res, data });
});

export const getExchangeRate = catchAsync(async (req: Request, res: Response) => {
	requireAdminUser(req);
	const data = await adminExchangeRateService.getExchangeRateByDate(req.params.date as string);
	sendSuccess({ res, data });
});

export const createExchangeRate = catchAsync(async (req: Request, res: Response) => {
	const adminUserId = requireAdminUser(req);
	const body = req.body as CreateExchangeRateBody;
	const data = await adminExchangeRateService.createExchangeRate(adminUserId, body);
	sendSuccess({ res, statusCode: 201, message: messages.EXCHANGE_RATE_CREATED, data });
});

export const updateExchangeRate = catchAsync(async (req: Request, res: Response) => {
	const adminUserId = requireAdminUser(req);
	const body = req.body as UpdateExchangeRateBody;
	const data = await adminExchangeRateService.updateExchangeRate(
		adminUserId,
		req.params.date as string,
		body,
	);
	sendSuccess({ res, message: messages.EXCHANGE_RATE_UPDATED, data });
});

export const deleteExchangeRate = catchAsync(async (req: Request, res: Response) => {
	requireAdminUser(req);
	await adminExchangeRateService.deleteExchangeRate(req.params.date as string);
	sendSuccess({ res, message: messages.EXCHANGE_RATE_DELETED, data: null });
});

export const retryExchangeRate = catchAsync(async (req: Request, res: Response) => {
	const adminUserId = requireAdminUser(req);
	const data = await adminExchangeRateService.retryExchangeRate(adminUserId, req.params.date as string);
	sendSuccess({ res, message: messages.EXCHANGE_RATE_SYNC_OK, data });
});

export const syncTodayExchangeRate = catchAsync(async (req: Request, res: Response) => {
	const adminUserId = requireAdminUser(req);
	const data = await adminExchangeRateService.syncTodayExchangeRate(adminUserId);
	sendSuccess({ res, message: messages.EXCHANGE_RATE_SYNC_OK, data });
});

export const listFxSyncLogs = catchAsync(async (req: Request, res: Response) => {
	requireAdminUser(req);
	const query = req.query as unknown as ListFxSyncLogsQuery;
	const data = await adminExchangeRateService.listFxSyncLogs(query);
	sendSuccess({ res, data });
});
