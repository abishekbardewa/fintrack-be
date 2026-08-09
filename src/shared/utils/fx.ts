import { config } from '../../config/env.js';
import { getMockRates, getRatesForDate } from '../../modules/exchange-rate/exchange-rate.service.js';
import { mockUsdRates } from './mockUsdRates.js';

export { mockUsdRates };

export function convertWithRates(
	amount: number,
	from: string,
	to: string,
	rates: Record<string, number>,
): number {
	const fromCode = from.toUpperCase();
	const toCode = to.toUpperCase();
	if (fromCode === toCode) {
		return amount;
	}

	const fromRate = rates[fromCode];
	const toRate = rates[toCode];
	if (fromRate === undefined || toRate === undefined || fromRate === 0) {
		return amount;
	}

	const inUsd = amount / fromRate;
	const converted = inUsd * toRate;
	return Math.round(converted * 100) / 100;
}

export function convertAmountMock(amount: number, from: string, to: string): number {
	return convertWithRates(amount, from, to, mockUsdRates);
}

export async function convertAmount(
	amount: number,
	from: string,
	to: string,
	date: Date = new Date(),
): Promise<number> {
	if (from.toUpperCase() === to.toUpperCase()) {
		return amount;
	}

	if (!config.fx.enabled) {
		return convertAmountMock(amount, from, to);
	}

	const rates = await getRatesForDate(date);
	return convertWithRates(amount, from, to, rates);
}

export async function toAmountPreferred(
	amount: number,
	from: string,
	userCurrency: string,
	date: Date = new Date(),
): Promise<number> {
	return convertAmount(amount, from, userCurrency, date);
}

export async function resolveRates(date: Date = new Date()): Promise<Record<string, number>> {
	if (!config.fx.enabled) {
		return getMockRates();
	}
	return getRatesForDate(date);
}
