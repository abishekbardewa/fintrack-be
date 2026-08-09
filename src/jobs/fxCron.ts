import { config } from '../config/env.js';
import { logger } from '../config/logger.js';
import { syncExchangeRatesForDate, toRateDateKey } from '../modules/exchange-rate/exchange-rate.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function msUntilNextCronHour(hourUtc: number): number {
	const now = new Date();
	const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hourUtc, 0, 0, 0));
	if (next.getTime() <= now.getTime()) {
		next.setUTCDate(next.getUTCDate() + 1);
	}
	return next.getTime() - now.getTime();
}

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
	const delay = msUntilNextCronHour(hour);
	logger.info('FX cron scheduled', { hourUtc: hour, startsInMs: delay });

	setTimeout(() => {
		void runFxSyncJob();
		setInterval(() => {
			void runFxSyncJob();
		}, DAY_MS);
	}, delay);
}
