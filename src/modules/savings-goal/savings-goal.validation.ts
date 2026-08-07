import { z } from 'zod';
import { SavingsGoalStatus } from '../../config/enums.js';
import { limits } from '../../config/limits.js';

const objectIdSchema = z.string().trim().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');
const dateSchema = z.coerce.date();

export const createSavingsGoalBodySchema = z.object({
	name: z.string().trim().min(1).max(50),
	targetAmount: z.number().positive(),
	currency: z.string().trim().toUpperCase().min(3).max(3).optional(),
	targetDate: dateSchema.nullish(),
});

export const updateSavingsGoalBodySchema = z
	.object({
		name: z.string().trim().min(1).max(50).optional(),
		targetAmount: z.number().positive().optional(),
		targetDate: dateSchema.nullish(),
		status: z
			.enum([SavingsGoalStatus.Active, SavingsGoalStatus.Completed, SavingsGoalStatus.Cancelled])
			.optional(),
	})
	.refine((body) => Object.keys(body).length > 0, {
		message: 'At least one field is required',
	});

export const listSavingsGoalsQuerySchema = z.object({
	status: z
		.enum([SavingsGoalStatus.Active, SavingsGoalStatus.Completed, SavingsGoalStatus.Cancelled])
		.optional(),
});

export const createContributionBodySchema = z.object({
	amount: z.number().positive(),
	currency: z.string().trim().toUpperCase().min(3).max(3).optional(),
	date: dateSchema.optional(),
	note: z.string().trim().max(limits.importDescriptionMaxLength).nullish(),
});

export const savingsGoalIdParamsSchema = z.object({
	id: objectIdSchema,
});

export const contributionParamsSchema = z.object({
	id: objectIdSchema,
	contributionId: objectIdSchema,
});

export type CreateSavingsGoalBody = z.infer<typeof createSavingsGoalBodySchema>;
export type UpdateSavingsGoalBody = z.infer<typeof updateSavingsGoalBodySchema>;
export type ListSavingsGoalsQuery = z.infer<typeof listSavingsGoalsQuerySchema>;
export type CreateContributionBody = z.infer<typeof createContributionBodySchema>;
