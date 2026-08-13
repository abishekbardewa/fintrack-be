import { z } from 'zod';
import { currencyCodes } from '../../config/currencySeeds.js';
import { ExchangeRateProcess, ExchangeRateStatus } from '../../config/enums.js';
import { limits } from '../../config/limits.js';

const dateKeySchema = z
	.string()
	.trim()
	.regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

const ratesSchema = z
	.record(z.string().trim().toUpperCase(), z.number().positive())
	.refine((rates) => Object.keys(rates).length > 0, { message: 'At least one rate is required' })
	.refine(
		(rates) => Object.keys(rates).every((code) => (currencyCodes as readonly string[]).includes(code)),
		{ message: 'One or more currency codes are unsupported' },
	);

export const listExchangeRatesQuerySchema = z.object({
	from: dateKeySchema.optional(),
	to: dateKeySchema.optional(),
	status: z.enum([ExchangeRateStatus.Ok, ExchangeRateStatus.Error]).optional(),
	process: z
		.enum([
			ExchangeRateProcess.SystemCron,
			ExchangeRateProcess.ExternalCronOrg,
			ExchangeRateProcess.AdminSync,
			ExchangeRateProcess.AdminRetry,
			ExchangeRateProcess.AdminManual,
		])
		.optional(),
	limit: z.coerce.number().int().min(1).max(500).default(100),
	page: z.coerce.number().int().min(1).default(1),
});

export const exchangeRateDateParamsSchema = z.object({
	date: dateKeySchema,
});

export const createExchangeRateBodySchema = z.object({
	date: dateKeySchema,
	base: z.string().trim().toUpperCase().default(limits.systemBaseCurrency),
	rates: ratesSchema.optional(),
	notes: z.string().trim().max(500).nullish(),
});

export const updateExchangeRateBodySchema = z
	.object({
		rates: ratesSchema.optional(),
		notes: z.string().trim().max(500).nullish(),
	})
	.refine((body) => body.rates !== undefined || body.notes !== undefined, {
		message: 'At least one field is required',
	});

export type ListExchangeRatesQuery = z.infer<typeof listExchangeRatesQuerySchema>;
export type CreateExchangeRateBody = z.infer<typeof createExchangeRateBodySchema>;
export type UpdateExchangeRateBody = z.infer<typeof updateExchangeRateBodySchema>;
