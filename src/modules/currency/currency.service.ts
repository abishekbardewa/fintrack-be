import { CurrencyModel } from './currency.model.js';

export async function listCurrencies(enabledOnly = true) {
	const filter = enabledOnly ? { enabled: true } : {};
	const currencies = await CurrencyModel.find(filter).sort({ sortOrder: 1, code: 1 }).lean();

	return currencies.map((c) => ({
		code: c.code,
		name: c.name,
		symbol: c.symbol,
		decimals: c.decimals,
		enabled: c.enabled,
		sortOrder: c.sortOrder,
	}));
}
