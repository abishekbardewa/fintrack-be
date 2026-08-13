import type { Request, Response } from 'express';
import { ExchangeRateProcess, ExchangeRateTriggeredByLabel } from '../../config/enums.js';
import { messages } from '../../config/messages.js';
import { AppError } from '../../shared/errors/AppError.js';
import { catchAsync } from '../../shared/middleware/catchAsync.js';
import { sendSuccess } from '../../shared/response/apiResponse.js';
import { syncExchangeRatesForDate, toRateDateKey } from './exchange-rate.service.js';

export const syncTodayExternalCron = catchAsync(async (_req: Request, res: Response) => {
	const date = toRateDateKey();
	const ok = await syncExchangeRatesForDate(date, {
		process: ExchangeRateProcess.ExternalCronOrg,
		triggeredBy: ExchangeRateTriggeredByLabel.ExternalCronOrg,
	});
	if (!ok) {
		throw new AppError(messages.EXCHANGE_RATE_SYNC_FAILED, 502);
	}
	sendSuccess({ res, message: messages.EXCHANGE_RATE_SYNC_OK });
});
