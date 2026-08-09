import { Router } from 'express';
import { requireAdmin, requireAuth } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import {
	createExchangeRate,
	deleteExchangeRate,
	getExchangeRate,
	listExchangeRates,
	listFxSyncLogs,
	retryExchangeRate,
	syncTodayExchangeRate,
	updateExchangeRate,
} from './admin-exchange-rate.controller.js';
import {
	createExchangeRateBodySchema,
	exchangeRateDateParamsSchema,
	listExchangeRatesQuerySchema,
	listFxSyncLogsQuerySchema,
	updateExchangeRateBodySchema,
} from './exchange-rate.validation.js';

const adminExchangeRateRouter = Router();

adminExchangeRateRouter.use(requireAuth, requireAdmin);

adminExchangeRateRouter.get('/logs', validate({ query: listFxSyncLogsQuerySchema }), listFxSyncLogs);
adminExchangeRateRouter.post('/sync-today', syncTodayExchangeRate);
adminExchangeRateRouter.get('/', validate({ query: listExchangeRatesQuerySchema }), listExchangeRates);
adminExchangeRateRouter.post('/', validate({ body: createExchangeRateBodySchema }), createExchangeRate);
adminExchangeRateRouter.get(
	'/:date',
	validate({ params: exchangeRateDateParamsSchema }),
	getExchangeRate,
);
adminExchangeRateRouter.patch(
	'/:date',
	validate({ params: exchangeRateDateParamsSchema, body: updateExchangeRateBodySchema }),
	updateExchangeRate,
);
adminExchangeRateRouter.delete(
	'/:date',
	validate({ params: exchangeRateDateParamsSchema }),
	deleteExchangeRate,
);
adminExchangeRateRouter.post(
	'/:date/retry',
	validate({ params: exchangeRateDateParamsSchema }),
	retryExchangeRate,
);

export default adminExchangeRateRouter;
