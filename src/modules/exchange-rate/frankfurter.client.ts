import { currencyCodes } from '../../config/currencySeeds.js';
import { limits } from '../../config/limits.js';
import { logger } from '../../config/logger.js';

export type FrankfurterRates = Record<string, number>;

type FrankfurterResponse = {
	amount: number;
	base: string;
	date: string;
	rates: Record<string, number>;
};

const FRANKFURTER_BASE = 'https://api.frankfurter.app';

export async function fetchFrankfurterRates(dateKey?: string): Promise<{
	date: string;
	base: string;
	rates: FrankfurterRates;
}> {
	const path = dateKey ? `/${dateKey}` : '/latest';
	const to = currencyCodes.filter((code) => code !== limits.systemBaseCurrency).join(',');
	const url = `${FRANKFURTER_BASE}${path}?from=${limits.systemBaseCurrency}&to=${to}`;

	const response = await fetch(url);
	if (!response.ok) {
		const body = await response.text().catch(() => '');
		logger.warn('Frankfurter request failed', { status: response.status, body, url });
		throw new Error(`Frankfurter HTTP ${response.status}`);
	}

	const data = (await response.json()) as FrankfurterResponse;
	const rates: FrankfurterRates = { [limits.systemBaseCurrency]: 1 };
	for (const [code, value] of Object.entries(data.rates ?? {})) {
		rates[code.toUpperCase()] = value;
	}

	return {
		date: data.date,
		base: (data.base || limits.systemBaseCurrency).toUpperCase(),
		rates,
	};
}
