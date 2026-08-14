export const exportTransactionColumns = [
	'date',
	'type',
	'category',
	'subcategory',
	'amount',
	'amountPreferred',
	'description',
] as const;

export type ExportTransactionColumn = (typeof exportTransactionColumns)[number];

export const exportTransactionColumnLabels: Record<ExportTransactionColumn, string> = {
	date: 'Date',
	type: 'Type',
	category: 'Category',
	subcategory: 'Subcategory',
	amount: 'Amount',
	amountPreferred: 'Amount Preferred',
	description: 'Description',
};

export const exportTransactionColumnWidths: Record<ExportTransactionColumn, number> = {
	date: 14,
	type: 12,
	category: 22,
	subcategory: 22,
	amount: 18,
	amountPreferred: 20,
	description: 40,
};
