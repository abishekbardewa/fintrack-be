import {
	ExchangeRateProcess,
	ExchangeRateSource,
	ExchangeRateStatus,
	type ExchangeRateProcessValue,
} from '../../config/enums.js';
import { limits } from '../../config/limits.js';
import { logger } from '../../config/logger.js';
import { mockUsdRates } from '../../shared/utils/mockUsdRates.js';
import { ExchangeRateModel } from './exchange-rate.model.js';
import { fetchFrankfurterRates, type FrankfurterRates } from './frankfurter.client.js';

const memoryCache = new Map<string, FrankfurterRates>();

export type SyncExchangeRatesOptions = {
	maxAttempts?: number;
	retryDelayMs?: number | ((attempt: number) => number);
	process: ExchangeRateProcessValue;
	triggeredBy: string;
};

export function toRateDateKey(date: Date = new Date()): string {
	return date.toISOString().slice(0, 10);
}

function ratesFromDoc(rates: Map<string, number> | Record<string, number> | undefined): FrankfurterRates {
	const out: FrankfurterRates = { [limits.systemBaseCurrency]: 1 };
	if (!rates) {
		return out;
	}
	if (rates instanceof Map) {
		for (const [code, value] of rates.entries()) {
			out[code.toUpperCase()] = value;
		}
		return out;
	}
	for (const [code, value] of Object.entries(rates)) {
		out[code.toUpperCase()] = value;
	}
	return out;
}

function errorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}
	return String(error);
}

async function upsertRates(
	dateKey: string,
	rates: FrankfurterRates,
	attemptCount: number,
	process: ExchangeRateProcessValue,
	triggeredBy: string,
): Promise<FrankfurterRates> {
	const normalized = { ...rates, [limits.systemBaseCurrency]: 1 };
	const now = new Date();
	await ExchangeRateModel.updateOne(
		{ date: dateKey },
		{
			$set: {
				date: dateKey,
				base: limits.systemBaseCurrency,
				rates: normalized,
				fetchedAt: now,
				source: ExchangeRateSource.Frankfurter,
				status: ExchangeRateStatus.Ok,
				process,
				triggeredBy,
				attemptCount,
				lastError: null,
				updatedBy: triggeredBy,
			},
		},
		{ upsert: true },
	);
	memoryCache.set(dateKey, normalized);
	return normalized;
}

async function markRateError(
	dateKey: string,
	attemptCount: number,
	error: unknown,
	process: ExchangeRateProcessValue,
	triggeredBy: string,
): Promise<void> {
	const now = new Date();
	await ExchangeRateModel.updateOne(
		{ date: dateKey },
		{
			$set: {
				lastError: {
					message: errorMessage(error),
					at: now,
				},
				status: ExchangeRateStatus.Error,
				source: ExchangeRateSource.Frankfurter,
				process,
				triggeredBy,
				attemptCount,
				updatedBy: triggeredBy,
				updatedAt: now,
			},
			$setOnInsert: {
				date: dateKey,
				base: limits.systemBaseCurrency,
				rates: { [limits.systemBaseCurrency]: 1 },
				fetchedAt: now,
			},
		},
		{ upsert: true },
	);
}

async function fetchAndStore(
	dateKey: string,
	attemptCount: number,
	process: ExchangeRateProcessValue,
	triggeredBy: string,
): Promise<FrankfurterRates> {
	const fetched = await fetchFrankfurterRates(dateKey);
	return upsertRates(dateKey, fetched.rates, attemptCount, process, triggeredBy);
}

export async function syncExchangeRatesForDate(
	dateKey: string = toRateDateKey(),
	options: SyncExchangeRatesOptions,
): Promise<boolean> {
	const maxAttempts = options.maxAttempts ?? limits.fxCronMaxAttempts;
	const { process, triggeredBy } = options;

	const existing = await ExchangeRateModel.findOne({ date: dateKey }).select('process attemptCount').lean();
	if (existing?.process === ExchangeRateProcess.AdminManual) {
		logger.info('Exchange rates sync skipped (admin_manual)', { date: dateKey, process, triggeredBy });
		return true;
	}

	const priorAttemptCount = existing?.attemptCount ?? 0;
	let lastError: unknown;

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		const attemptCount = priorAttemptCount + attempt;
		try {
			await fetchAndStore(dateKey, attemptCount, process, triggeredBy);
			logger.info('Exchange rates synced', {
				date: dateKey,
				attempt,
				attemptCount,
				process,
				triggeredBy,
			});
			return true;
		} catch (error) {
			lastError = error;
			logger.warn('Exchange rates sync attempt failed', {
				date: dateKey,
				attempt,
				attemptCount,
				process,
				error,
			});
			await markRateError(dateKey, attemptCount, error, process, triggeredBy);
			if (attempt < maxAttempts) {
				const delayMs =
					typeof options.retryDelayMs === 'function'
						? options.retryDelayMs(attempt)
						: (options.retryDelayMs ?? (attempt === 1 ? 5 * 60 * 1000 : 15 * 60 * 1000));
				await new Promise((resolve) => setTimeout(resolve, delayMs));
			}
		}
	}

	logger.error('Exchange rates sync failed after retries', { date: dateKey, process, error: lastError });
	return false;
}

async function findNearestUsableOnOrBefore(dateKey: string): Promise<FrankfurterRates | null> {
	const doc = await ExchangeRateModel.findOne({
		date: { $lte: dateKey },
		status: { $ne: ExchangeRateStatus.Error },
	})
		.sort({ date: -1 })
		.lean();
	if (!doc) {
		return null;
	}
	const rates = ratesFromDoc(doc.rates as Map<string, number> | Record<string, number>);
	memoryCache.set(doc.date, rates);
	return rates;
}

/**
 * Resolve rates for display/conversion. Never calls Frankfurter.
 * Exact day → nearest older usable day (in memory only) → mock.
 */
export async function getRatesForDate(date: Date = new Date()): Promise<FrankfurterRates> {
	const dateKey = toRateDateKey(date);

	const cached = memoryCache.get(dateKey);
	if (cached) {
		return cached;
	}

	const exact = await ExchangeRateModel.findOne({
		date: dateKey,
		status: { $ne: ExchangeRateStatus.Error },
	}).lean();
	if (exact) {
		const rates = ratesFromDoc(exact.rates as Map<string, number> | Record<string, number>);
		memoryCache.set(dateKey, rates);
		return rates;
	}

	const nearest = await findNearestUsableOnOrBefore(dateKey);
	if (nearest) {
		return nearest;
	}

	return { ...mockUsdRates };
}

export function getMockRates(): FrankfurterRates {
	return { ...mockUsdRates };
}

export function clearExchangeRateMemoryCache(dateKey?: string): void {
	if (dateKey) {
		memoryCache.delete(dateKey);
		return;
	}
	memoryCache.clear();
}
