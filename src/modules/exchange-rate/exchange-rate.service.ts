import { mockUsdRates } from '../../shared/utils/mockUsdRates.js';
import { ExchangeRateModel } from './exchange-rate.model.js';
import { fetchFrankfurterRates, type FrankfurterRates } from './frankfurter.client.js';
import { limits } from '../../config/limits.js';
import { logger } from '../../config/logger.js';

const memoryCache = new Map<string, FrankfurterRates>();
const inFlight = new Map<string, Promise<FrankfurterRates>>();

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

async function upsertRates(
	dateKey: string,
	rates: FrankfurterRates,
	attemptCount: number,
): Promise<FrankfurterRates> {
	const normalized = { ...rates, [limits.systemBaseCurrency]: 1 };
	await ExchangeRateModel.updateOne(
		{ date: dateKey },
		{
			$set: {
				date: dateKey,
				base: limits.systemBaseCurrency,
				rates: normalized,
				fetchedAt: new Date(),
				source: 'frankfurter',
				attemptCount,
			},
		},
		{ upsert: true },
	);
	memoryCache.set(dateKey, normalized);
	return normalized;
}

async function fetchAndStore(dateKey: string, attemptCount: number): Promise<FrankfurterRates> {
	const fetched = await fetchFrankfurterRates(dateKey);
	return upsertRates(dateKey, fetched.rates, attemptCount);
}

export async function syncExchangeRatesForDate(dateKey: string = toRateDateKey()): Promise<boolean> {
	let lastError: unknown;
	for (let attempt = 1; attempt <= limits.fxCronMaxAttempts; attempt++) {
		try {
			await fetchAndStore(dateKey, attempt);
			logger.info('Exchange rates synced', { date: dateKey, attempt });
			return true;
		} catch (error) {
			lastError = error;
			logger.warn('Exchange rates sync attempt failed', { date: dateKey, attempt, error });
			if (attempt < limits.fxCronMaxAttempts) {
				const delayMs = attempt === 1 ? 5 * 60 * 1000 : 15 * 60 * 1000;
				await new Promise((resolve) => setTimeout(resolve, delayMs));
			}
		}
	}
	logger.error('Exchange rates sync failed after retries', { date: dateKey, error: lastError });
	return false;
}

async function findNearestOnOrBefore(dateKey: string): Promise<FrankfurterRates | null> {
	const doc = await ExchangeRateModel.findOne({ date: { $lte: dateKey } }).sort({ date: -1 }).lean();
	if (!doc) {
		return null;
	}
	const rates = ratesFromDoc(doc.rates as Map<string, number> | Record<string, number>);
	memoryCache.set(doc.date, rates);
	return rates;
}

export async function getRatesForDate(date: Date = new Date()): Promise<FrankfurterRates> {
	const dateKey = toRateDateKey(date);

	const cached = memoryCache.get(dateKey);
	if (cached) {
		return cached;
	}

	const exact = await ExchangeRateModel.findOne({ date: dateKey }).lean();
	if (exact) {
		const rates = ratesFromDoc(exact.rates as Map<string, number> | Record<string, number>);
		memoryCache.set(dateKey, rates);
		return rates;
	}

	const nearest = await findNearestOnOrBefore(dateKey);
	if (nearest) {
		return nearest;
	}

	const pending = inFlight.get(dateKey);
	if (pending) {
		return pending;
	}

	const fetchPromise = (async () => {
		try {
			return await fetchAndStore(dateKey, 1);
		} catch (error) {
			logger.warn('On-demand Frankfurter fetch failed; using mock rates', { date: dateKey, error });
			return { ...mockUsdRates };
		} finally {
			inFlight.delete(dateKey);
		}
	})();

	inFlight.set(dateKey, fetchPromise);
	return fetchPromise;
}

export function getMockRates(): FrankfurterRates {
	return { ...mockUsdRates };
}
