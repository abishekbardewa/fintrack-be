export const TransactionType = {
	Expense: 'expense',
	Income: 'income',
} as const;

export type TransactionTypeValue = (typeof TransactionType)[keyof typeof TransactionType];

export const CategoryKind = {
	Expense: 'expense',
	Income: 'income',
} as const;

export type CategoryKindValue = (typeof CategoryKind)[keyof typeof CategoryKind];

export const BudgetPeriodType = {
	Month: 'month',
	Week: 'week',
} as const;

export type BudgetPeriodTypeValue = (typeof BudgetPeriodType)[keyof typeof BudgetPeriodType];

export const BudgetProgressStatus = {
	Ok: 'ok',
	Warning: 'warning',
	Over: 'over',
} as const;

export type BudgetProgressStatusValue = (typeof BudgetProgressStatus)[keyof typeof BudgetProgressStatus];

export const SavingsGoalStatus = {
	Active: 'active',
	Completed: 'completed',
	Cancelled: 'cancelled',
} as const;

export type SavingsGoalStatusValue = (typeof SavingsGoalStatus)[keyof typeof SavingsGoalStatus];

export const SavingsContributionSource = {
	Manual: 'manual',
	IncomeTransaction: 'income_transaction',
} as const;

export type SavingsContributionSourceValue =
	(typeof SavingsContributionSource)[keyof typeof SavingsContributionSource];

export const ExportFormat = {
	Csv: 'csv',
	Xlsx: 'xlsx',
} as const;

export const MonthlyReviewStatus = {
	Available: 'available',
	Generated: 'generated',
	Skipped: 'skipped',
	InsufficientData: 'insufficient_data',
} as const;
