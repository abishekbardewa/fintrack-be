import type { Request, Response } from 'express';
import { catchAsync } from '../../shared/middleware/catchAsync.js';
import { sendSuccess } from '../../shared/response/apiResponse.js';
import * as currencyService from './currency.service.js';

export const listCurrencies = catchAsync(async (req: Request, res: Response) => {
	const enabledParam = req.query.enabled;
	const enabledOnly = enabledParam === undefined || enabledParam === 'true';
	const currencies = await currencyService.listCurrencies(enabledOnly);

	sendSuccess({
		res,
		statusCode: 200,
		message: 'Success',
		data: { currencies },
	});
});
