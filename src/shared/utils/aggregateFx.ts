import { resolveRates, convertWithRates } from './fx.js';
import { round2 } from './money.js';
import { toRateDateKey } from '../../modules/exchange-rate/exchange-rate.service.js';

export type AmountRow = {
	amount: number;
	currency: string;
	date: Date;
};

/**
 * Convert and sum rows into preferred currency.
 * Rates are fetched once per distinct rate date key (YYYY-MM-DD of each row date).
 */
export async function sumInPreferred(rows: AmountRow[], preferredCurrency: string): Promise<number> {
	if (rows.length === 0) {
		return 0;
	}

	const byRateDate = new Map<string, AmountRow[]>();
	for (const row of rows) {
		const key = toRateDateKey(row.date);
		const list = byRateDate.get(key);
		if (list) {
			list.push(row);
		} else {
			byRateDate.set(key, [row]);
		}
	}

	let total = 0;
	for (const [dateKey, group] of byRateDate.entries()) {
		const rates = await resolveRates(new Date(`${dateKey}T12:00:00.000Z`));
		for (const row of group) {
			if (row.currency.toUpperCase() === preferredCurrency.toUpperCase()) {
				total += row.amount;
			} else {
				total += convertWithRates(row.amount, row.currency, preferredCurrency, rates);
			}
		}
	}

	return round2(total);
}

export async function convertAmountWithCachedRates(
	amount: number,
	from: string,
	to: string,
	date: Date,
	rateCache: Map<string, Record<string, number>>,
): Promise<number> {
	if (from.toUpperCase() === to.toUpperCase()) {
		return amount;
	}
	const key = toRateDateKey(date);
	let rates = rateCache.get(key);
	if (!rates) {
		rates = await resolveRates(date);
		rateCache.set(key, rates);
	}
	return convertWithRates(amount, from, to, rates);
}
