export const currencySeeds = [
	{ code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2, enabled: true, sortOrder: 10 },
	{ code: 'EUR', name: 'Euro', symbol: '€', decimals: 2, enabled: true, sortOrder: 20 },
	{ code: 'GBP', name: 'British Pound', symbol: '£', decimals: 2, enabled: true, sortOrder: 30 },
	{ code: 'INR', name: 'Indian Rupee', symbol: '₹', decimals: 2, enabled: true, sortOrder: 40 },
	{ code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', decimals: 2, enabled: true, sortOrder: 50 },
	{ code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimals: 2, enabled: true, sortOrder: 60 },
	{ code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimals: 0, enabled: true, sortOrder: 70 },
	{ code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', decimals: 2, enabled: true, sortOrder: 80 },
] as const;

export type CurrencySeedCode = (typeof currencySeeds)[number]['code'];

export const currencyCodes = currencySeeds.map((c) => c.code) as [CurrencySeedCode, ...CurrencySeedCode[]];
