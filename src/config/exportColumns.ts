export const exportTransactionColumns = [
	'date',
	'type',
	'category',
	'subcategory',
	'amount',
	'currency',
	'amountPreferred',
	'description',
] as const;

export type ExportTransactionColumn = (typeof exportTransactionColumns)[number];
