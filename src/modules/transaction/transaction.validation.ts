import { z } from 'zod';
import { TransactionType } from '../../config/enums.js';
import { limits } from '../../config/limits.js';

const objectIdSchema = z.string().trim().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

const dateSchema = z.coerce.date();

export const createTransactionBodySchema = z.object({
	type: z.enum([TransactionType.Expense, TransactionType.Income]),
	amount: z.number().positive(),
	currency: z.string().trim().toUpperCase().min(3).max(3).optional(),
	categoryId: objectIdSchema,
	subcategoryId: objectIdSchema.nullish(),
	description: z
		.string()
		.trim()
		.max(limits.importDescriptionMaxLength)
		.optional()
		.default(''),
	date: dateSchema,
});

export const updateTransactionBodySchema = z
	.object({
		type: z.enum([TransactionType.Expense, TransactionType.Income]).optional(),
		amount: z.number().positive().optional(),
		currency: z.string().trim().toUpperCase().min(3).max(3).optional(),
		categoryId: objectIdSchema.optional(),
		subcategoryId: objectIdSchema.nullish(),
		description: z.string().trim().max(limits.importDescriptionMaxLength).optional(),
		date: dateSchema.optional(),
	})
	.refine((body) => Object.keys(body).length > 0, {
		message: 'At least one field is required',
	});

export const listTransactionsQuerySchema = z.object({
	q: z.string().trim().optional(),
	type: z.enum([TransactionType.Expense, TransactionType.Income]).optional(),
	categoryId: objectIdSchema.optional(),
	subcategoryId: objectIdSchema.optional(),
	from: z.coerce.date().optional(),
	to: z.coerce.date().optional(),
	minAmount: z.coerce.number().nonnegative().optional(),
	maxAmount: z.coerce.number().positive().optional(),
	currency: z.string().trim().toUpperCase().min(3).max(3).optional(),
	page: z.coerce.number().int().positive().optional().default(1),
	limit: z.coerce
		.number()
		.int()
		.positive()
		.max(limits.listMaxPageSize)
		.optional()
		.default(limits.listDefaultPageSize),
});

export const suggestDescriptionsQuerySchema = z.object({
	categoryId: objectIdSchema,
	subcategoryId: objectIdSchema.optional(),
	type: z.enum([TransactionType.Expense, TransactionType.Income]).optional(),
});

export const transactionIdParamsSchema = z.object({
	id: objectIdSchema,
});

export type CreateTransactionBody = z.infer<typeof createTransactionBodySchema>;
export type UpdateTransactionBody = z.infer<typeof updateTransactionBodySchema>;
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;
export type SuggestDescriptionsQuery = z.infer<typeof suggestDescriptionsQuerySchema>;
