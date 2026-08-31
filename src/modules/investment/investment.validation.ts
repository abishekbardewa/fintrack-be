import { z } from 'zod';
import { InvestmentStatus } from '../../config/enums.js';
import { limits } from '../../config/limits.js';

const objectIdSchema = z.string().trim().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');
const dateSchema = z.coerce.date();
const noteSchema = z.string().trim().max(limits.importDescriptionMaxLength).nullish();

export const createInvestmentBodySchema = z.object({
	name: z.string().trim().min(1).max(50),
	currency: z.string().trim().toUpperCase().min(3).max(3).optional(),
	notes: noteSchema,
	startDate: dateSchema.optional(),
	startingAmount: z.number().positive().optional(),
});

export const updateInvestmentBodySchema = z
	.object({
		name: z.string().trim().min(1).max(50).optional(),
		notes: noteSchema,
		startDate: dateSchema.nullish(),
	})
	.refine((body) => Object.keys(body).length > 0, {
		message: 'At least one field is required',
	});

export const listInvestmentsQuerySchema = z.object({
	status: z.enum([InvestmentStatus.Active, InvestmentStatus.Closed]).optional(),
});

export const investmentIdParamsSchema = z.object({
	id: objectIdSchema,
});

export const investmentTransactionParamsSchema = z.object({
	id: objectIdSchema,
	transactionId: objectIdSchema,
});

export const listInvestmentTransactionsQuerySchema = z.object({
	page: z.coerce.number().int().positive().optional().default(1),
	limit: z.coerce
		.number()
		.int()
		.positive()
		.max(limits.listMaxPageSize)
		.optional()
		.default(limits.listDefaultPageSize),
});

export const investmentMovementBodySchema = z.object({
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

export const closeInvestmentBodySchema = z.object({
	date: dateSchema.optional(),
	note: noteSchema,
});

export const updateInvestmentTransactionBodySchema = z
	.object({
		amount: z.number().positive().optional(),
		currency: z.string().trim().toUpperCase().min(3).max(3).optional(),
		date: dateSchema.optional(),
		note: noteSchema,
	})
	.refine((body) => Object.keys(body).length > 0, {
		message: 'At least one field is required',
	});

export type CreateInvestmentBody = z.infer<typeof createInvestmentBodySchema>;
export type UpdateInvestmentBody = z.infer<typeof updateInvestmentBodySchema>;
export type ListInvestmentsQuery = z.infer<typeof listInvestmentsQuerySchema>;
export type ListInvestmentTransactionsQuery = z.infer<typeof listInvestmentTransactionsQuerySchema>;
export type InvestmentMovementBody = z.infer<typeof investmentMovementBodySchema>;
export type StartingBalanceBody = z.infer<typeof startingBalanceBodySchema>;
export type CloseInvestmentBody = z.infer<typeof closeInvestmentBodySchema>;
export type UpdateInvestmentTransactionBody = z.infer<typeof updateInvestmentTransactionBodySchema>;
