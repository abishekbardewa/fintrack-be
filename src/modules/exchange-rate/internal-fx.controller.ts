import type { Request, Response } from 'express';
import { FxSyncLogType } from '../../config/enums.js';
import { messages } from '../../config/messages.js';
import { AppError } from '../../shared/errors/AppError.js';
import { catchAsync } from '../../shared/middleware/catchAsync.js';
import { sendSuccess } from '../../shared/response/apiResponse.js';
import { syncExchangeRatesForDate, toRateDateKey } from './exchange-rate.service.js';
import { getExchangeRateByDate } from './admin-exchange-rate.service.js';

export const syncTodayExternalCron = catchAsync(async (_req: Request, res: Response) => {
	const date = toRateDateKey();
	const ok = await syncExchangeRatesForDate(date, {
		triggeredBy: 'external_cron',
		logType: FxSyncLogType.DailyCron,
	});
	if (!ok) {
		throw new AppError(messages.EXCHANGE_RATE_SYNC_FAILED, 502);
	}
	const data = await getExchangeRateByDate(date);
	sendSuccess({ res, message: messages.EXCHANGE_RATE_SYNC_OK, data });
});
