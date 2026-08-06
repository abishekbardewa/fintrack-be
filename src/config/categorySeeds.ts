import { CategoryKind } from './enums.js';

export const categorySeeds = {
	[CategoryKind.Expense]: [
		'Entertainment',
		'Food & Dining',
		'Fruits & Vegetables',
		'Groceries',
		'Transport',
		'Utilities',
	],
	[CategoryKind.Income]: ['Cash', 'Salary'],
} as const;
