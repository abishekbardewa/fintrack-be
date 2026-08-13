import type { Request, Response } from 'express';
import { messages } from '../../config/messages.js';
import { AppError } from '../../shared/errors/AppError.js';
import { catchAsync } from '../../shared/middleware/catchAsync.js';
import { sendSuccess } from '../../shared/response/apiResponse.js';
import * as adminExchangeRateService from './admin-exchange-rate.service.js';
import type {
	CreateExchangeRateBody,
	ListExchangeRatesQuery,
	UpdateExchangeRateBody,
} from './exchange-rate.validation.js';

function requireAdminActor(req: Request): { name: string } {
	if (!req.user?.userId) {
		throw new AppError(messages.TOKEN_INVALID, 401);
	}
	const name = req.user.name?.trim();
	if (!name) {
		throw new AppError(messages.TOKEN_INVALID, 401);
	}
	return { name };
}

export const listExchangeRates = catchAsync(async (req: Request, res: Response) => {
	requireAdminActor(req);
	const query = req.query as unknown as ListExchangeRatesQuery;
	const data = await adminExchangeRateService.listExchangeRates(query);
	sendSuccess({ res, data });
});

export const getExchangeRate = catchAsync(async (req: Request, res: Response) => {
	requireAdminActor(req);
	const data = await adminExchangeRateService.getExchangeRateByDate(req.params.date as string);
	sendSuccess({ res, data });
});

export const createExchangeRate = catchAsync(async (req: Request, res: Response) => {
	const { name } = requireAdminActor(req);
	const body = req.body as CreateExchangeRateBody;
	const data = await adminExchangeRateService.createExchangeRate(name, body);
	sendSuccess({ res, statusCode: 201, message: messages.EXCHANGE_RATE_CREATED, data });
});

export const updateExchangeRate = catchAsync(async (req: Request, res: Response) => {
	const { name } = requireAdminActor(req);
	const body = req.body as UpdateExchangeRateBody;
	const data = await adminExchangeRateService.updateExchangeRate(name, req.params.date as string, body);
	sendSuccess({ res, message: messages.EXCHANGE_RATE_UPDATED, data });
});

export const deleteExchangeRate = catchAsync(async (req: Request, res: Response) => {
	requireAdminActor(req);
	await adminExchangeRateService.deleteExchangeRate(req.params.date as string);
	sendSuccess({ res, message: messages.EXCHANGE_RATE_DELETED, data: null });
});

export const retryExchangeRate = catchAsync(async (req: Request, res: Response) => {
	const { name } = requireAdminActor(req);
	const data = await adminExchangeRateService.retryExchangeRate(name, req.params.date as string);
	sendSuccess({ res, message: messages.EXCHANGE_RATE_SYNC_OK, data });
});

export const syncTodayExchangeRate = catchAsync(async (req: Request, res: Response) => {
	const { name } = requireAdminActor(req);
	const data = await adminExchangeRateService.syncTodayExchangeRate(name);
	sendSuccess({ res, message: messages.EXCHANGE_RATE_SYNC_OK, data });
});
