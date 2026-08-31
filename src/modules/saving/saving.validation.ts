import { z } from 'zod';
import { limits } from '../../config/limits.js';

const objectIdSchema = z.string().trim().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');
const dateSchema = z.coerce.date();
const noteSchema = z.string().trim().max(limits.importDescriptionMaxLength).nullish();

export const createSavingBodySchema = z.object({
	name: z.string().trim().min(1).max(50),
	currency: z.string().trim().toUpperCase().min(3).max(3).optional(),
	notes: noteSchema,
	startingAmount: z.number().positive().optional(),
});

export const updateSavingBodySchema = z
	.object({
		name: z.string().trim().min(1).max(50).optional(),
		notes: noteSchema,
	})
	.refine((body) => Object.keys(body).length > 0, {
		message: 'At least one field is required',
	});

export const savingIdParamsSchema = z.object({
	id: objectIdSchema,
});

export const savingTransactionParamsSchema = z.object({
	id: objectIdSchema,
	transactionId: objectIdSchema,
});

export const listSavingTransactionsQuerySchema = z.object({
	page: z.coerce.number().int().positive().optional().default(1),
	limit: z.coerce
		.number()
		.int()
		.positive()
		.max(limits.listMaxPageSize)
		.optional()
		.default(limits.listDefaultPageSize),
});

export const savingMovementBodySchema = z.object({
	amount: z.number().positive(),
	currency: z.string().trim().toUpperCase().min(3).max(3).optional(),
	date: dateSchema.optional(),
	note: noteSchema,
});

export const startingBalanceBodySchema = z.object({
	amount: z.number().positive(),
	currency: z.string().trim().toUpperCase().min(3).max(3).optional(),
	date: dateSchema.optional(),
});

export const updateSavingTransactionBodySchema = z
	.object({
		amount: z.number().positive().optional(),
		currency: z.string().trim().toUpperCase().min(3).max(3).optional(),
		date: dateSchema.optional(),
		note: noteSchema,
	})
	.refine((body) => Object.keys(body).length > 0, {
		message: 'At least one field is required',
	});

export type CreateSavingBody = z.infer<typeof createSavingBodySchema>;
export type UpdateSavingBody = z.infer<typeof updateSavingBodySchema>;
export type ListSavingTransactionsQuery = z.infer<typeof listSavingTransactionsQuerySchema>;
export type SavingMovementBody = z.infer<typeof savingMovementBodySchema>;
export type StartingBalanceBody = z.infer<typeof startingBalanceBodySchema>;
export type UpdateSavingTransactionBody = z.infer<typeof updateSavingTransactionBodySchema>;
