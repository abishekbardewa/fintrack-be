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

export type ExportFormatValue = (typeof ExportFormat)[keyof typeof ExportFormat];

export const ExportRangePreset = {
	ThisMonth: 'this_month',
	LastMonth: 'last_month',
	Last3Months: 'last_3_months',
} as const;

export type ExportRangePresetValue = (typeof ExportRangePreset)[keyof typeof ExportRangePreset];

export const MonthlyReviewStatus = {
	Available: 'available',
	Generated: 'generated',
	Skipped: 'skipped',
	InsufficientData: 'insufficient_data',
} as const;

export const UserRole = {
	User: 'user',
	Admin: 'admin',
} as const;

export type UserRoleValue = (typeof UserRole)[keyof typeof UserRole];

export const ExchangeRateStatus = {
	Ok: 'ok',
	Error: 'error',
} as const;

export type ExchangeRateStatusValue = (typeof ExchangeRateStatus)[keyof typeof ExchangeRateStatus];

export const ExchangeRateSource = {
	Frankfurter: 'frankfurter',
} as const;

export type ExchangeRateSourceValue = (typeof ExchangeRateSource)[keyof typeof ExchangeRateSource];

export const ExchangeRateProcess = {
	SystemCron: 'system_cron',
	ExternalCronOrg: 'external_cron_org',
	AdminSync: 'admin_sync',
	AdminRetry: 'admin_retry',
	AdminManual: 'admin_manual',
} as const;

export type ExchangeRateProcessValue = (typeof ExchangeRateProcess)[keyof typeof ExchangeRateProcess];

/** Display labels stored in ExchangeRate.triggeredBy for non-admin actors. */
export const ExchangeRateTriggeredByLabel = {
	SystemCron: 'System Cron',
	ExternalCronOrg: 'External Cron.org',
} as const;
