import { z } from './zod.js';
import {
	BudgetPeriodType,
	BudgetProgressStatus,
	CategoryKind,
	ExchangeRateProcess,
	ExchangeRateSource,
	ExchangeRateStatus,
	SavingsContributionSource,
	SavingsGoalStatus,
	TransactionType,
} from '../config/enums.js';

export const objectIdSchema = z
	.string()
	.regex(/^[a-fA-F0-9]{24}$/)
	.openapi({ example: '507f1f77bcf86cd799439011' });

export const isoDateTimeSchema = z.string().datetime().openapi({ example: '2026-08-01T00:00:00.000Z' });

export const errorDetailSchema = z.object({
	field: z.string(),
	message: z.string(),
});

export const errorResponseSchema = z
	.object({
		success: z.literal(false),
		statusCode: z.number().int(),
		message: z.string(),
		details: z.array(errorDetailSchema).optional(),
	})
	.openapi('ErrorResponse');

export function successResponseSchema<T extends z.ZodTypeAny>(dataSchema: T, name?: string) {
	const schema = z.object({
		success: z.literal(true),
		statusCode: z.number().int(),
		message: z.string(),
		data: dataSchema,
	});
	return name ? schema.openapi(name) : schema;
}

export const publicUserSchema = z
	.object({
		id: objectIdSchema,
		name: z.string(),
		email: z.string().email(),
		currency: z.string().length(3),
		timezone: z.string(),
		createdAt: isoDateTimeSchema.optional(),
		updatedAt: isoDateTimeSchema.optional(),
	})
	.openapi('User');

export const authSuccessDataSchema = z
	.object({
		user: publicUserSchema,
		accessToken: z.string(),
	})
	.openapi('AuthSuccessData');

export const currencySchema = z
	.object({
		code: z.string().length(3),
		name: z.string(),
		symbol: z.string(),
		decimals: z.number().int(),
		enabled: z.boolean(),
		sortOrder: z.number().int(),
	})
	.openapi('Currency');

export const publicCategorySchema = z
	.object({
		id: objectIdSchema,
		name: z.string(),
		kind: z.enum([CategoryKind.Expense, CategoryKind.Income]),
		parentCategoryId: objectIdSchema.nullable(),
		createdAt: isoDateTimeSchema.optional(),
		updatedAt: isoDateTimeSchema.optional(),
	})
	.openapi('Category');

export const publicTransactionSchema = z
	.object({
		id: objectIdSchema,
		type: z.enum([TransactionType.Expense, TransactionType.Income]),
		amount: z.number(),
		currency: z.string().length(3),
		amountPreferred: z.number(),
		categoryId: objectIdSchema,
		subcategoryId: objectIdSchema.nullable(),
		description: z.string(),
		date: isoDateTimeSchema,
		createdAt: isoDateTimeSchema.optional(),
		updatedAt: isoDateTimeSchema.optional(),
	})
	.openapi('Transaction');

export const transactionListDataSchema = z
	.object({
		items: z.array(publicTransactionSchema),
		page: z.number().int(),
		limit: z.number().int(),
		total: z.number().int(),
		totalPages: z.number().int(),
	})
	.openapi('TransactionListData');

export const transactionMonthSummaryDataSchema = z
	.object({
		year: z.number().int(),
		month: z.number().int().min(1).max(12),
		currency: z.string().length(3),
		monthTotals: z.object({
			spent: z.number(),
			income: z.number(),
			count: z.number().int(),
		}),
		days: z.array(
			z.object({
				date: z.string().openapi({ example: '2026-08-12' }),
				spent: z.number(),
				income: z.number(),
				count: z.number().int(),
			}),
		),
	})
	.openapi('TransactionMonthSummaryData');

export const publicBudgetSchema = z
	.object({
		id: objectIdSchema,
		periodType: z.enum([BudgetPeriodType.Month, BudgetPeriodType.Week]),
		categoryId: objectIdSchema.nullable(),
		year: z.number().int().nullable(),
		month: z.number().int().nullable(),
		weekStart: isoDateTimeSchema.nullable(),
		effectiveFrom: isoDateTimeSchema,
		effectiveTo: isoDateTimeSchema,
		limitAmount: z.number(),
		currency: z.string().length(3),
		limitAmountPreferred: z.number(),
		spent: z.number(),
		spentPreferred: z.number(),
		remaining: z.number(),
		percent: z.number(),
		status: z.enum([BudgetProgressStatus.Ok, BudgetProgressStatus.Warning, BudgetProgressStatus.Over]),
		createdAt: isoDateTimeSchema.optional(),
		updatedAt: isoDateTimeSchema.optional(),
	})
	.openapi('Budget');

export const publicSavingsGoalSchema = z
	.object({
		id: objectIdSchema,
		name: z.string(),
		targetAmount: z.number(),
		currency: z.string().length(3),
		currentAmount: z.number(),
		targetAmountPreferred: z.number(),
		currentAmountPreferred: z.number(),
		percent: z.number(),
		remaining: z.number(),
		targetDate: isoDateTimeSchema.nullable(),
		status: z.enum([SavingsGoalStatus.Active, SavingsGoalStatus.Completed, SavingsGoalStatus.Cancelled]),
		createdAt: isoDateTimeSchema.optional(),
		updatedAt: isoDateTimeSchema.optional(),
	})
	.openapi('SavingsGoal');

export const publicContributionSchema = z
	.object({
		id: objectIdSchema,
		goalId: objectIdSchema,
		amount: z.number(),
		currency: z.string().length(3),
		amountPreferred: z.number(),
		date: isoDateTimeSchema,
		note: z.string().nullable(),
		source: z.enum([SavingsContributionSource.Manual, SavingsContributionSource.IncomeTransaction]),
		transactionId: objectIdSchema.nullable(),
		createdAt: isoDateTimeSchema.optional(),
		updatedAt: isoDateTimeSchema.optional(),
	})
	.openapi('SavingsContribution');

export const healthDataSchema = z
	.object({
		status: z.literal('healthy'),
	})
	.openapi('HealthData');

const categoryAmountSchema = z.object({
	categoryId: objectIdSchema.nullable(),
	name: z.string(),
	amount: z.number(),
	percent: z.number(),
});

const categoryBreakdownSchema = z.object({
	categoryId: objectIdSchema,
	name: z.string(),
	amount: z.number(),
	percent: z.number(),
	subcategories: z.array(
		z.object({
			subcategoryId: objectIdSchema.nullable(),
			name: z.string().nullable(),
			amount: z.number(),
			percent: z.number(),
		}),
	),
});

const vsPreviousSchema = z.object({
	incomePct: z.number().nullable(),
	expensePct: z.number().nullable(),
	netPct: z.number().nullable(),
});

export const dashboardDataSchema = z
	.object({
		period: z.object({
			type: z.enum(['month', 'year']),
			from: isoDateTimeSchema,
			to: isoDateTimeSchema,
			label: z.string(),
		}),
		currency: z.string().length(3),
		summary: z.object({
			income: z.number(),
			expense: z.number(),
			net: z.number(),
			savingsRate: z.number().nullable(),
			vsPrevious: vsPreviousSchema,
		}),
		cashFlow: z.array(
			z.object({
				date: isoDateTimeSchema,
				label: z.string(),
				income: z.number(),
				expense: z.number(),
			}),
		),
		byCategory: z.array(categoryAmountSchema),
		byCategoryBreakdown: z.array(categoryBreakdownSchema),
		byCategoryBreakdownPrevious: z.array(categoryBreakdownSchema),
		categoryCompare: z.object({
			a: z.object({
				key: z.string(),
				label: z.string(),
				income: z.number(),
				expense: z.number(),
				net: z.number(),
				byCategory: z.array(categoryAmountSchema),
			}),
			b: z.object({
				key: z.string(),
				label: z.string(),
				income: z.number(),
				expense: z.number(),
				net: z.number(),
				byCategory: z.array(categoryAmountSchema),
			}),
		}),
		budgets: z.array(
			z.object({
				id: objectIdSchema,
				categoryId: objectIdSchema.nullable(),
				name: z.string(),
				limit: z.number(),
				spent: z.number(),
				remaining: z.number(),
				percent: z.number(),
				status: z.enum([
					BudgetProgressStatus.Ok,
					BudgetProgressStatus.Warning,
					BudgetProgressStatus.Over,
				]),
			}),
		),
		goals: z.array(
			z.object({
				id: objectIdSchema,
				name: z.string(),
				current: z.number(),
				target: z.number(),
				remaining: z.number(),
				percent: z.number(),
				targetDate: z.string().nullable(),
				daysLeft: z.number().int().nullable(),
			}),
		),
		recentTransactions: z.array(
			z.object({
				id: objectIdSchema,
				type: z.enum([TransactionType.Expense, TransactionType.Income]),
				description: z.string(),
				categoryName: z.string(),
				subcategoryName: z.string().nullable(),
				amount: z.number(),
				date: isoDateTimeSchema,
			}),
		),
	})
	.openapi('DashboardData');

export const trendsDataSchema = z
	.object({
		range: z.object({
			type: z.enum(['last6', 'last12', 'year', 'lastYear', 'last2y', 'last5y']),
			from: isoDateTimeSchema,
			to: isoDateTimeSchema,
			label: z.string(),
		}),
		currency: z.string().length(3),
		summary: z.object({
			income: z.number(),
			expense: z.number(),
			net: z.number(),
			vsPrevious: vsPreviousSchema,
		}),
		series: z.array(
			z.object({
				month: z.string(),
				label: z.string(),
				income: z.number(),
				expense: z.number(),
				net: z.number(),
			}),
		),
		categoryOptions: z.array(
			z.object({
				id: objectIdSchema,
				name: z.string(),
			}),
		),
		categorySeries: z.array(
			z.object({
				categoryId: objectIdSchema,
				name: z.string(),
				points: z.array(
					z.object({
						month: z.string(),
						label: z.string(),
						amount: z.number(),
					}),
				),
			}),
		),
	})
	.openapi('TrendsData');

export const exchangeRateLastErrorSchema = z
	.object({
		message: z.string(),
		at: isoDateTimeSchema,
	})
	.openapi('ExchangeRateLastError');

export const publicExchangeRateSchema = z
	.object({
		id: objectIdSchema,
		date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).openapi({ example: '2026-08-13' }),
		base: z.string().length(3).openapi({ example: 'USD' }),
		rates: z
			.record(z.string(), z.number())
			.openapi({ example: { USD: 1, EUR: 0.92, INR: 83.5 } }),
		fetchedAt: isoDateTimeSchema,
		source: z.literal(ExchangeRateSource.Frankfurter),
		status: z.enum([ExchangeRateStatus.Ok, ExchangeRateStatus.Error]),
		process: z.enum([
			ExchangeRateProcess.SystemCron,
			ExchangeRateProcess.ExternalCronOrg,
			ExchangeRateProcess.AdminSync,
			ExchangeRateProcess.AdminRetry,
			ExchangeRateProcess.AdminManual,
		]),
		triggeredBy: z.string().openapi({ example: 'System Cron' }),
		attemptCount: z.number().int().min(1),
		lastError: exchangeRateLastErrorSchema.nullable(),
		notes: z.string().nullable(),
		updatedBy: z.string().nullable(),
		createdAt: isoDateTimeSchema.optional(),
		updatedAt: isoDateTimeSchema.optional(),
	})
	.openapi('ExchangeRate');

export const exchangeRateListDataSchema = z
	.object({
		items: z.array(publicExchangeRateSchema),
		page: z.number().int(),
		limit: z.number().int(),
		total: z.number().int(),
		base: z.string().length(3).openapi({ example: 'USD' }),
		source: z.literal(ExchangeRateSource.Frankfurter),
	})
	.openapi('ExchangeRateListData');

export const jsonContent = <T extends z.ZodTypeAny>(schema: T) => ({
	'application/json': { schema },
});

export const bearerSecurity = [{ bearerAuth: [] }];
