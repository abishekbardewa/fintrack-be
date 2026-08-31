import { z } from 'zod';
import { SavingCircleFrequency, SavingCircleStatus } from '../../config/enums.js';
import { limits } from '../../config/limits.js';

const objectIdSchema = z.string().trim().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');
const dateSchema = z.coerce.date();
const noteSchema = z.string().trim().max(limits.importDescriptionMaxLength).nullish();
const frequencySchema = z.enum([
	SavingCircleFrequency.Weekly,
	SavingCircleFrequency.Monthly,
	SavingCircleFrequency.Yearly,
]);

export const createSavingsCircleBodySchema = z.object({
	name: z.string().trim().min(1).max(50),
	currency: z.string().trim().toUpperCase().min(3).max(3).optional(),
	notes: noteSchema,
	contributionAmount: z.number().positive(),
	frequency: frequencySchema,
	memberCount: z.number().int().min(2).max(100),
	startDate: dateSchema,
	expectedPayout: z.number().positive().optional(),
});

export const updateSavingsCircleBodySchema = z
	.object({
		name: z.string().trim().min(1).max(50).optional(),
		notes: noteSchema,
		contributionAmount: z.number().positive().optional(),
		frequency: frequencySchema.optional(),
		memberCount: z.number().int().min(2).max(100).optional(),
		startDate: dateSchema.optional(),
		expectedPayout: z.number().positive().optional(),
	})
	.refine((body) => Object.keys(body).length > 0, {
		message: 'At least one field is required',
	});

export const listSavingsCirclesQuerySchema = z.object({
	status: z.enum([SavingCircleStatus.Active, SavingCircleStatus.Completed]).optional(),
});

export const savingsCircleIdParamsSchema = z.object({
	id: objectIdSchema,
});

export const savingsCircleTransactionParamsSchema = z.object({
	id: objectIdSchema,
	transactionId: objectIdSchema,
});

export const listSavingsCircleTransactionsQuerySchema = z.object({
	page: z.coerce.number().int().positive().optional().default(1),
	limit: z.coerce
		.number()
		.int()
		.positive()
		.max(limits.listMaxPageSize)
		.optional()
		.default(limits.listDefaultPageSize),
});

export const savingsCircleMovementBodySchema = z.object({
	amount: z.number().positive(),
	currency: z.string().trim().toUpperCase().min(3).max(3).optional(),
	date: dateSchema.optional(),
	note: noteSchema,
});

export const updateSavingsCircleTransactionBodySchema = z
	.object({
		amount: z.number().positive().optional(),
		currency: z.string().trim().toUpperCase().min(3).max(3).optional(),
		date: dateSchema.optional(),
		note: noteSchema,
	})
	.refine((body) => Object.keys(body).length > 0, {
		message: 'At least one field is required',
	});

export type CreateSavingsCircleBody = z.infer<typeof createSavingsCircleBodySchema>;
export type UpdateSavingsCircleBody = z.infer<typeof updateSavingsCircleBodySchema>;
export type ListSavingsCirclesQuery = z.infer<typeof listSavingsCirclesQuerySchema>;
export type ListSavingsCircleTransactionsQuery = z.infer<typeof listSavingsCircleTransactionsQuerySchema>;
export type SavingsCircleMovementBody = z.infer<typeof savingsCircleMovementBodySchema>;
export type UpdateSavingsCircleTransactionBody = z.infer<typeof updateSavingsCircleTransactionBodySchema>;
