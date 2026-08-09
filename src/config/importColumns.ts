/**
 * Columns FE should use when generating the import spreadsheet template.
 * FE maps category/subcategory names → ids before calling POST /transactions/import.
 */
export const importTransactionColumns = [
	'date',
	'type',
	'category',
	'subcategory',
	'amount',
	'currency',
	'description',
] as const;

export type ImportTransactionColumn = (typeof importTransactionColumns)[number];
