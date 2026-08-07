import { z } from 'zod';
import { BudgetPeriodType } from '../../config/enums.js';

const objectIdSchema = z.string().trim().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

export const upsertBudgetBodySchema = z
	.object({
		periodType: z.enum([BudgetPeriodType.Month, BudgetPeriodType.Week]),
		categoryId: objectIdSchema.nullish(),
		year: z.coerce.number().int().min(2000).max(2100).optional(),
		month: z.coerce.number().int().min(1).max(12).optional(),
		weekStart: z.coerce.date().optional(),
		limitAmount: z.number().positive(),
		currency: z.string().trim().toUpperCase().min(3).max(3).optional(),
	})
	.superRefine((body, ctx) => {
		if (body.periodType === BudgetPeriodType.Month) {
			if (body.year === undefined) {
				ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'year is required for month budgets', path: ['year'] });
			}
			if (body.month === undefined) {
				ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'month is required for month budgets', path: ['month'] });
			}
		}
		if (body.periodType === BudgetPeriodType.Week && body.weekStart === undefined) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'weekStart is required for week budgets',
				path: ['weekStart'],
			});
		}
	});

export const listBudgetsQuerySchema = z
	.object({
		periodType: z.enum([BudgetPeriodType.Month, BudgetPeriodType.Week]),
		year: z.coerce.number().int().min(2000).max(2100).optional(),
		month: z.coerce.number().int().min(1).max(12).optional(),
		weekStart: z.coerce.date().optional(),
	})
	.superRefine((query, ctx) => {
		if (query.periodType === BudgetPeriodType.Month) {
			if (query.year === undefined) {
				ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'year is required', path: ['year'] });
			}
			if (query.month === undefined) {
				ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'month is required', path: ['month'] });
			}
		}
		if (query.periodType === BudgetPeriodType.Week && query.weekStart === undefined) {
			ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'weekStart is required', path: ['weekStart'] });
		}
	});

export const budgetIdParamsSchema = z.object({
	id: objectIdSchema,
});

export type UpsertBudgetBody = z.infer<typeof upsertBudgetBodySchema>;
export type ListBudgetsQuery = z.infer<typeof listBudgetsQuerySchema>;
