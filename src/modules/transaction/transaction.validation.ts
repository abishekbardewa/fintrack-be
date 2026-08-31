import { z } from 'zod';
import { ExportFormat, ExportRangePreset, TransactionType } from '../../config/enums.js';
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
	fundedFromGoalId: objectIdSchema.nullish(),
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

export const monthSummaryQuerySchema = z.object({
	year: z.coerce.number().int().min(2000).max(2100),
	month: z.coerce.number().int().min(1).max(12),
});

export const transactionIdParamsSchema = z.object({
	id: objectIdSchema,
});

export const exportTransactionsQuerySchema = z
	.object({
		format: z.enum([ExportFormat.Csv, ExportFormat.Xlsx]),
		preset: z
			.enum([
				ExportRangePreset.ThisMonth,
				ExportRangePreset.LastMonth,
				ExportRangePreset.Last3Months,
			])
			.optional(),
		q: z.string().trim().optional(),
		type: z.enum([TransactionType.Expense, TransactionType.Income]).optional(),
		categoryId: objectIdSchema.optional(),
		subcategoryId: objectIdSchema.optional(),
		from: z.coerce.date().optional(),
		to: z.coerce.date().optional(),
		minAmount: z.coerce.number().nonnegative().optional(),
		maxAmount: z.coerce.number().positive().optional(),
		currency: z.string().trim().toUpperCase().min(3).max(3).optional(),
	})
	.superRefine((query, ctx) => {
		const hasFrom = query.from !== undefined;
		const hasTo = query.to !== undefined;
		if (hasFrom !== hasTo) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Both from and to are required when using a custom date range',
				path: hasFrom ? ['to'] : ['from'],
			});
		}
		if (hasFrom && hasTo && query.from && query.to && query.from.getTime() > query.to.getTime()) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'from must be before or equal to to',
				path: ['from'],
			});
		}
	});

export const importTransactionRowSchema = z.object({
	date: dateSchema,
	type: z.enum([TransactionType.Expense, TransactionType.Income]),
	categoryId: objectIdSchema,
	subcategoryId: objectIdSchema.nullish(),
	amount: z.number().positive(),
	currency: z.string().trim().toUpperCase().min(3).max(3).optional(),
	description: z
		.string()
		.trim()
		.max(limits.importDescriptionMaxLength)
		.optional()
		.default(''),
});

export const importTransactionsBodySchema = z.object({
	transactions: z
		.array(importTransactionRowSchema)
		.min(1, 'At least one transaction is required')
		.max(limits.importMaxRows, `At most ${limits.importMaxRows} transactions can be imported at once`),
});

export type CreateTransactionBody = z.infer<typeof createTransactionBodySchema>;
export type UpdateTransactionBody = z.infer<typeof updateTransactionBodySchema>;
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;
export type SuggestDescriptionsQuery = z.infer<typeof suggestDescriptionsQuerySchema>;
export type MonthSummaryQuery = z.infer<typeof monthSummaryQuerySchema>;
export type ExportTransactionsQuery = z.infer<typeof exportTransactionsQuerySchema>;
export type ImportTransactionsBody = z.infer<typeof importTransactionsBodySchema>;
export type ImportTransactionRow = z.infer<typeof importTransactionRowSchema>;
