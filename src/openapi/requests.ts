import {
	BudgetPeriodType,
	CategoryKind,
	ExchangeRateProcess,
	ExchangeRateStatus,
	ExportFormat,
	ExportRangePreset,
	SavingCircleFrequency,
	SavingCircleStatus,
	SavingsGoalStatus,
	InvestmentStatus,
	TransactionType,
} from '../config/enums.js';
import { limits } from '../config/limits.js';
import { isoDateTimeSchema, objectIdSchema } from './schemas.js';
import { z } from './zod.js';

export const registerBodySchema = z
	.object({
		name: z.string().min(3).max(30),
		email: z.string().email(),
		password: z.string().min(8).max(30),
		currency: z.string().length(3).openapi({ example: 'INR' }),
		timezone: z.string().min(1).max(64).optional().openapi({ example: limits.defaultTimezone }),
	})
	.openapi('RegisterBody');

export const loginBodySchema = z
	.object({
		email: z.string().email(),
		password: z.string().min(1),
	})
	.openapi('LoginBody');

export const updateMeBodySchema = z
	.object({
		name: z.string().min(3).max(30).optional(),
		currency: z.string().length(3).optional(),
		openingBalance: z
			.object({
				amount: z.number().nonnegative(),
				currency: z.string().length(3),
			})
			.optional(),
		startingBalancePromptDismissed: z.literal(true).optional(),
	})
	.openapi('UpdateMeBody');

export const changePasswordBodySchema = z
	.object({
		currentPassword: z.string().min(1),
		newPassword: z.string().min(8).max(30),
	})
	.openapi('ChangePasswordBody');

export const listCategoriesQuerySchema = z.object({
	kind: z.enum([CategoryKind.Expense, CategoryKind.Income]).optional(),
});

export const createCategoryBodySchema = z
	.object({
		name: z.string().min(1).max(50),
		kind: z.enum([CategoryKind.Expense, CategoryKind.Income]),
		parentCategoryId: objectIdSchema.nullable().optional(),
	})
	.openapi('CreateCategoryBody');

export const updateCategoryBodySchema = z
	.object({
		name: z.string().min(1).max(50),
	})
	.openapi('UpdateCategoryBody');

export const idParamsSchema = z.object({
	id: objectIdSchema,
});

export const createTransactionBodySchema = z
	.object({
		type: z.enum([TransactionType.Expense, TransactionType.Income]),
		amount: z.number().positive(),
		currency: z.string().length(3).optional(),
		categoryId: objectIdSchema,
		subcategoryId: objectIdSchema.nullable().optional(),
		description: z.string().max(limits.importDescriptionMaxLength).optional(),
		date: isoDateTimeSchema,
		fundedFromGoalId: objectIdSchema.nullable().optional(),
	})
	.openapi('CreateTransactionBody');

export const updateTransactionBodySchema = z
	.object({
		type: z.enum([TransactionType.Expense, TransactionType.Income]).optional(),
		amount: z.number().positive().optional(),
		currency: z.string().length(3).optional(),
		categoryId: objectIdSchema.optional(),
		subcategoryId: objectIdSchema.nullable().optional(),
		description: z.string().max(limits.importDescriptionMaxLength).optional(),
		date: isoDateTimeSchema.optional(),
	})
	.openapi('UpdateTransactionBody');

export const listTransactionsQuerySchema = z.object({
	q: z.string().optional(),
	type: z.enum([TransactionType.Expense, TransactionType.Income]).optional(),
	categoryId: objectIdSchema.optional(),
	subcategoryId: objectIdSchema.optional(),
	from: isoDateTimeSchema.optional(),
	to: isoDateTimeSchema.optional(),
	minAmount: z.coerce.number().nonnegative().optional(),
	maxAmount: z.coerce.number().positive().optional(),
	currency: z.string().length(3).optional(),
	page: z.coerce.number().int().positive().optional(),
	limit: z.coerce.number().int().positive().max(limits.listMaxPageSize).optional(),
});

export const suggestDescriptionsQuerySchema = z.object({
	categoryId: objectIdSchema,
	subcategoryId: objectIdSchema.optional(),
	type: z.enum([TransactionType.Expense, TransactionType.Income]).optional(),
});

export const monthSummaryQuerySchema = z.object({
	year: z.coerce.number().int().min(2000).max(2100).openapi({ example: 2026 }),
	month: z.coerce.number().int().min(1).max(12).openapi({ example: 8 }),
});

export const upsertBudgetBodySchema = z
	.object({
		periodType: z.enum([BudgetPeriodType.Month, BudgetPeriodType.Week]),
		categoryId: objectIdSchema.nullable().optional(),
		year: z.number().int().min(2000).max(2100).optional(),
		month: z.number().int().min(1).max(12).optional(),
		weekStart: isoDateTimeSchema.optional(),
		limitAmount: z.number().positive(),
		currency: z.string().length(3).optional(),
	})
	.openapi('UpsertBudgetBody');

export const listBudgetsQuerySchema = z.object({
	periodType: z.enum([BudgetPeriodType.Month, BudgetPeriodType.Week]),
	year: z.coerce.number().int().min(2000).max(2100).optional(),
	month: z.coerce.number().int().min(1).max(12).optional(),
	weekStart: isoDateTimeSchema.optional(),
});

export const createSavingsGoalBodySchema = z
	.object({
		name: z.string().min(1).max(50),
		targetAmount: z.number().positive(),
		currency: z.string().length(3).optional(),
		targetDate: isoDateTimeSchema.nullable().optional(),
		startingAmount: z.number().positive().optional(),
	})
	.openapi('CreateSavingsGoalBody');

export const updateSavingsGoalBodySchema = z
	.object({
		name: z.string().min(1).max(50).optional(),
		targetAmount: z.number().positive().optional(),
		targetDate: isoDateTimeSchema.nullable().optional(),
		status: z
			.enum([SavingsGoalStatus.Active, SavingsGoalStatus.Completed, SavingsGoalStatus.Cancelled])
			.optional(),
	})
	.openapi('UpdateSavingsGoalBody');

export const listSavingsGoalsQuerySchema = z.object({
	status: z
		.enum([SavingsGoalStatus.Active, SavingsGoalStatus.Completed, SavingsGoalStatus.Cancelled])
		.optional(),
});

export const listContributionsQuerySchema = z.object({
	page: z.coerce.number().int().positive().optional(),
	limit: z.coerce.number().int().positive().max(limits.listMaxPageSize).optional(),
});

export const createContributionBodySchema = z
	.object({
		amount: z.number().positive(),
		currency: z.string().length(3).optional(),
		date: isoDateTimeSchema.optional(),
		note: z.string().max(limits.importDescriptionMaxLength).nullable().optional(),
	})
	.openapi('CreateContributionBody');

export const startingBalanceBodySchema = z
	.object({
		amount: z.number().positive(),
		currency: z.string().length(3).optional(),
		date: isoDateTimeSchema.optional(),
	})
	.openapi('StartingBalanceBody');

export const updateContributionBodySchema = z
	.object({
		amount: z.number().positive().optional(),
		currency: z.string().length(3).optional(),
		date: isoDateTimeSchema.optional(),
		note: z.string().max(limits.importDescriptionMaxLength).nullable().optional(),
		categoryId: objectIdSchema.optional(),
		subcategoryId: objectIdSchema.nullable().optional(),
		description: z.string().max(limits.importDescriptionMaxLength).optional(),
	})
	.openapi('UpdateContributionBody');

export const spendFromGoalBodySchema = z
	.object({
		amount: z.number().positive(),
		currency: z.string().length(3).optional(),
		categoryId: objectIdSchema,
		subcategoryId: objectIdSchema.nullable().optional(),
		description: z.string().max(limits.importDescriptionMaxLength).optional(),
		note: z.string().max(limits.importDescriptionMaxLength).nullable().optional(),
		date: isoDateTimeSchema.optional(),
	})
	.openapi('SpendFromGoalBody');

export const returnFromGoalBodySchema = z
	.object({
		amount: z.number().positive().optional(),
		currency: z.string().length(3).optional(),
		date: isoDateTimeSchema.optional(),
		note: z.string().max(limits.importDescriptionMaxLength).nullable().optional(),
		cancel: z.boolean().optional(),
	})
	.openapi('ReturnFromGoalBody');

export const contributionParamsSchema = z.object({
	id: objectIdSchema,
	contributionId: objectIdSchema,
});

export const createSavingBodySchema = z
	.object({
		name: z.string().min(1).max(50),
		currency: z.string().length(3).optional(),
		notes: z.string().max(limits.importDescriptionMaxLength).nullable().optional(),
		startingAmount: z.number().positive().optional(),
	})
	.openapi('CreateSavingBody');

export const updateSavingBodySchema = z
	.object({
		name: z.string().min(1).max(50).optional(),
		notes: z.string().max(limits.importDescriptionMaxLength).nullable().optional(),
	})
	.openapi('UpdateSavingBody');

export const listSavingTransactionsQuerySchema = z.object({
	page: z.coerce.number().int().positive().optional(),
	limit: z.coerce.number().int().positive().max(limits.listMaxPageSize).optional(),
});

export const savingMovementBodySchema = z
	.object({
		amount: z.number().positive(),
		currency: z.string().length(3).optional(),
		date: isoDateTimeSchema.optional(),
		note: z.string().max(limits.importDescriptionMaxLength).nullable().optional(),
	})
	.openapi('SavingMovementBody');

export const updateSavingTransactionBodySchema = z
	.object({
		amount: z.number().positive().optional(),
		currency: z.string().length(3).optional(),
		date: isoDateTimeSchema.optional(),
		note: z.string().max(limits.importDescriptionMaxLength).nullable().optional(),
	})
	.openapi('UpdateSavingTransactionBody');

export const savingTransactionParamsSchema = z.object({
	id: objectIdSchema,
	transactionId: objectIdSchema,
});

export const createSavingsCircleBodySchema = z
	.object({
		name: z.string().min(1).max(50),
		currency: z.string().length(3).optional(),
		notes: z.string().max(limits.importDescriptionMaxLength).nullable().optional(),
		contributionAmount: z.number().positive(),
		frequency: z.enum([
			SavingCircleFrequency.Weekly,
			SavingCircleFrequency.Monthly,
			SavingCircleFrequency.Yearly,
		]),
		memberCount: z.number().int().min(2).max(100),
		startDate: isoDateTimeSchema,
		expectedPayout: z.number().positive().optional(),
	})
	.openapi('CreateSavingsCircleBody');

export const updateSavingsCircleBodySchema = z
	.object({
		name: z.string().min(1).max(50).optional(),
		notes: z.string().max(limits.importDescriptionMaxLength).nullable().optional(),
		contributionAmount: z.number().positive().optional(),
		frequency: z
			.enum([
				SavingCircleFrequency.Weekly,
				SavingCircleFrequency.Monthly,
				SavingCircleFrequency.Yearly,
			])
			.optional(),
		memberCount: z.number().int().min(2).max(100).optional(),
		startDate: isoDateTimeSchema.optional(),
		expectedPayout: z.number().positive().optional(),
	})
	.openapi('UpdateSavingsCircleBody');

export const listSavingsCirclesQuerySchema = z.object({
	status: z.enum([SavingCircleStatus.Active, SavingCircleStatus.Completed]).optional(),
});

export const listSavingsCircleTransactionsQuerySchema = z.object({
	page: z.coerce.number().int().positive().optional(),
	limit: z.coerce.number().int().positive().max(limits.listMaxPageSize).optional(),
});

export const savingsCircleMovementBodySchema = z
	.object({
		amount: z.number().positive(),
		currency: z.string().length(3).optional(),
		date: isoDateTimeSchema.optional(),
		note: z.string().max(limits.importDescriptionMaxLength).nullable().optional(),
	})
	.openapi('SavingsCircleMovementBody');

export const updateSavingsCircleTransactionBodySchema = z
	.object({
		amount: z.number().positive().optional(),
		currency: z.string().length(3).optional(),
		date: isoDateTimeSchema.optional(),
		note: z.string().max(limits.importDescriptionMaxLength).nullable().optional(),
	})
	.openapi('UpdateSavingsCircleTransactionBody');

export const savingsCircleTransactionParamsSchema = z.object({
	id: objectIdSchema,
	transactionId: objectIdSchema,
});

export const createInvestmentBodySchema = z
	.object({
		name: z.string().min(1).max(50),
		currency: z.string().length(3).optional(),
		notes: z.string().max(limits.importDescriptionMaxLength).nullable().optional(),
		startDate: isoDateTimeSchema.optional(),
		startingAmount: z.number().positive().optional(),
	})
	.openapi('CreateInvestmentBody');

export const updateInvestmentBodySchema = z
	.object({
		name: z.string().min(1).max(50).optional(),
		notes: z.string().max(limits.importDescriptionMaxLength).nullable().optional(),
		startDate: isoDateTimeSchema.nullable().optional(),
	})
	.openapi('UpdateInvestmentBody');

export const listInvestmentsQuerySchema = z.object({
	status: z.enum([InvestmentStatus.Active, InvestmentStatus.Closed]).optional(),
});

export const listInvestmentTransactionsQuerySchema = z.object({
	page: z.coerce.number().int().positive().optional(),
	limit: z.coerce.number().int().positive().max(limits.listMaxPageSize).optional(),
});

export const investmentMovementBodySchema = z
	.object({
		amount: z.number().positive(),
		currency: z.string().length(3).optional(),
		date: isoDateTimeSchema.optional(),
		note: z.string().max(limits.importDescriptionMaxLength).nullable().optional(),
	})
	.openapi('InvestmentMovementBody');

export const closeInvestmentBodySchema = z
	.object({
		date: isoDateTimeSchema.optional(),
		note: z.string().max(limits.importDescriptionMaxLength).nullable().optional(),
	})
	.openapi('CloseInvestmentBody');

export const updateInvestmentTransactionBodySchema = z
	.object({
		amount: z.number().positive().optional(),
		currency: z.string().length(3).optional(),
		date: isoDateTimeSchema.optional(),
		note: z.string().max(limits.importDescriptionMaxLength).nullable().optional(),
	})
	.openapi('UpdateInvestmentTransactionBody');

export const investmentTransactionParamsSchema = z.object({
	id: objectIdSchema,
	transactionId: objectIdSchema,
});

export const listCurrenciesQuerySchema = z.object({
	enabled: z.enum(['true', 'false']).optional(),
});

export const getDashboardQuerySchema = z
	.object({
		period: z.enum(['month', 'year']).openapi({ example: 'month' }),
	})
	.openapi('GetDashboardQuery');

export const getTrendsQuerySchema = z
	.object({
		range: z
			.enum(['last6', 'last12', 'year', 'lastYear', 'last2y', 'last5y'])
			.openapi({ example: 'last6' }),
		categoryIds: z
			.string()
			.optional()
			.openapi({ example: '507f1f77bcf86cd799439011,507f1f77bcf86cd799439012' }),
	})
	.openapi('GetTrendsQuery');

export const exportTransactionsQuerySchema = z
	.object({
		format: z.enum([ExportFormat.Csv, ExportFormat.Xlsx]).openapi({ example: ExportFormat.Csv }),
		preset: z
			.enum([
				ExportRangePreset.ThisMonth,
				ExportRangePreset.LastMonth,
				ExportRangePreset.Last3Months,
			])
			.optional()
			.openapi({ example: ExportRangePreset.ThisMonth }),
		q: z.string().optional(),
		type: z.enum([TransactionType.Expense, TransactionType.Income]).optional(),
		categoryId: objectIdSchema.optional(),
		subcategoryId: objectIdSchema.optional(),
		from: isoDateTimeSchema.optional(),
		to: isoDateTimeSchema.optional(),
		minAmount: z.coerce.number().nonnegative().optional(),
		maxAmount: z.coerce.number().positive().optional(),
		currency: z.string().length(3).optional(),
	})
	.openapi('ExportTransactionsQuery');

export const importTransactionsBodySchema = z
	.object({
		transactions: z
			.array(
				z.object({
					date: isoDateTimeSchema,
					type: z.enum([TransactionType.Expense, TransactionType.Income]),
					categoryId: objectIdSchema,
					subcategoryId: objectIdSchema.nullable().optional(),
					amount: z.number().positive().openapi({ example: 500 }),
					currency: z.string().length(3).optional().openapi({ example: 'INR' }),
					description: z.string().max(limits.importDescriptionMaxLength).optional(),
				}),
			)
			.min(1)
			.max(limits.importMaxRows),
	})
	.openapi('ImportTransactionsBody');

const exchangeRateDateKeySchema = z
	.string()
	.trim()
	.regex(/^\d{4}-\d{2}-\d{2}$/)
	.openapi({ example: '2026-08-13' });

const exchangeRatesMapSchema = z
	.record(z.string().trim().toUpperCase(), z.number().positive())
	.openapi({ example: { EUR: 0.92, INR: 83.5 } });

export const listExchangeRatesQuerySchema = z
	.object({
		from: exchangeRateDateKeySchema.optional(),
		to: exchangeRateDateKeySchema.optional(),
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
	})
	.openapi('ListExchangeRatesQuery');

export const exchangeRateDateParamsSchema = z
	.object({
		date: exchangeRateDateKeySchema,
	})
	.openapi('ExchangeRateDateParams');

export const createExchangeRateBodySchema = z
	.object({
		date: exchangeRateDateKeySchema,
		base: z.string().trim().toUpperCase().default(limits.systemBaseCurrency).openapi({ example: 'USD' }),
		rates: exchangeRatesMapSchema.optional(),
		notes: z.string().trim().max(500).nullish(),
	})
	.openapi('CreateExchangeRateBody');

export const updateExchangeRateBodySchema = z
	.object({
		rates: exchangeRatesMapSchema.optional(),
		notes: z.string().trim().max(500).nullish(),
	})
	.openapi('UpdateExchangeRateBody');
