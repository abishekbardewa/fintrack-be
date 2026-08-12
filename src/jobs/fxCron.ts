import cron from 'node-cron';
import { config } from '../config/env.js';
import { logger } from '../config/logger.js';
import { syncExchangeRatesForDate, toRateDateKey } from '../modules/exchange-rate/exchange-rate.service.js';

async function runFxSyncJob(): Promise<void> {
	const dateKey = toRateDateKey();
	logger.info('Starting FX cron sync', { date: dateKey });
	await syncExchangeRatesForDate(dateKey);
}

export function startFxCron(): void {
	if (!config.fx.enabled) {
		logger.info('FX cron skipped (FX_ENABLED=false)');
		return;
	}

	const hour = config.fx.cronHourUtc;
	const expression = `0 ${hour} * * *`;

	if (!cron.validate(expression)) {
		logger.error('FX cron expression invalid', { expression, hourUtc: hour });
		return;
	}

	logger.info('FX cron scheduled', { hourUtc: hour, expression, timezone: 'UTC' });

	cron.schedule(
		expression,
		async () => {
			try {
				await runFxSyncJob();
			} catch (error) {
				logger.error('FX cron job failed', { error });
			}
		},
		{
			timezone: 'UTC',
			name: 'fx-daily-sync',
			noOverlap: true,
		},
	);
}
