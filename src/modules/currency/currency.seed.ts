import { currencySeeds } from '../../config/currencySeeds.js';
import { logger } from '../../config/logger.js';
import { CurrencyModel } from './currency.model.js';

export async function seedCurrencies(): Promise<void> {
	const count = await CurrencyModel.estimatedDocumentCount();
	if (count > 0) {
		logger.info('Currency seed skipped (already present)', { count });
		return;
	}

	await CurrencyModel.insertMany([...currencySeeds]);
	logger.info('Seeded currencies', { count: currencySeeds.length });
}
