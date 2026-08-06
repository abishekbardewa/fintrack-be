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
