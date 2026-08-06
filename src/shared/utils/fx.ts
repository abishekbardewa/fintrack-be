export const mockUsdRates: Record<string, number> = {
	USD: 1,
	EUR: 0.92,
	GBP: 0.79,
	INR: 83.5,
	CAD: 1.36,
	AUD: 1.53,
	JPY: 149.5,
	AED: 3.67,
};

export function convertAmount(amount: number, from: string, to: string): number {
	const fromCode = from.toUpperCase();
	const toCode = to.toUpperCase();
	if (fromCode === toCode) {
		return amount;
	}

	const fromRate = mockUsdRates[fromCode];
	const toRate = mockUsdRates[toCode];
	if (fromRate === undefined || toRate === undefined) {
		return amount;
	}

	const inUsd = amount / fromRate;
	const converted = inUsd * toRate;
	return Math.round(converted * 100) / 100;
}

export function toAmountPreferred(amount: number, from: string, userCurrency: string): number {
	return convertAmount(amount, from, userCurrency);
}
