import { BudgetPeriodType, CategoryKind, TransactionType } from '../../config/enums.js';
import { messages } from '../../config/messages.js';
import { AppError } from '../../shared/errors/AppError.js';
import { convertAmount } from '../../shared/utils/fx.js';
import { CategoryModel } from '../category/category.model.js';
import { CurrencyModel } from '../currency/currency.model.js';
import { TransactionModel } from '../transaction/transaction.model.js';
import { UserModel } from '../user/user.model.js';
import { toPublicBudget } from './budget.mapper.js';
import { BudgetModel, type BudgetDocument } from './budget.model.js';
import type { ListBudgetsQuery, UpsertBudgetBody } from './budget.validation.js';

type ExpenseRow = {
	amount: number;
	currency: string;
	categoryId: { toString(): string };
	subcategoryId?: { toString(): string } | null;
};

type CategoryMeta = {
	id: string;
	isSubcategory: boolean;
};

async function getUserCurrency(userId: string): Promise<string> {
	const user = await UserModel.findById(userId).select('currency');
	if (!user) {
		throw new AppError(messages.USER_NOT_FOUND, 404);
	}
	return user.currency;
}

async function assertEnabledCurrency(code: string): Promise<void> {
	const found = await CurrencyModel.findOne({ code, enabled: true }).lean();
	if (!found) {
		throw new AppError(messages.CURRENCY_INVALID, 422);
	}
}

function startOfUtcDay(date: Date): Date {
	return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function endOfUtcDay(date: Date): Date {
	return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

function monthWindow(year: number, month: number): { effectiveFrom: Date; effectiveTo: Date } {
	const effectiveFrom = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
	const effectiveTo = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
	return { effectiveFrom, effectiveTo };
}

function weekWindow(weekStartInput: Date): { weekStart: Date; effectiveFrom: Date; effectiveTo: Date } {
	const weekStart = startOfUtcDay(weekStartInput);
	const endDay = new Date(weekStart);
	endDay.setUTCDate(endDay.getUTCDate() + 6);
	return {
		weekStart,
		effectiveFrom: weekStart,
		effectiveTo: endOfUtcDay(endDay),
	};
}

async function assertBudgetCategory(userId: string, categoryId: string | null | undefined): Promise<void> {
	if (!categoryId) {
		return;
	}
	const category = await CategoryModel.findOne({ _id: categoryId, userId });
	if (!category || category.kind !== CategoryKind.Expense) {
		throw new AppError(messages.BUDGET_CATEGORY_INVALID, 404);
	}
}

async function loadCategoryMeta(
	userId: string,
	categoryIds: Array<string | null>,
): Promise<Map<string, CategoryMeta>> {
	const ids = [...new Set(categoryIds.filter((id): id is string => Boolean(id)))];
	if (ids.length === 0) {
		return new Map();
	}
	const rows = await CategoryModel.find({ _id: { $in: ids }, userId }).lean();
	const map = new Map<string, CategoryMeta>();
	for (const row of rows) {
		map.set(row._id.toString(), {
			id: row._id.toString(),
			isSubcategory: row.parentCategoryId != null,
		});
	}
	return map;
}

function spentForBudget(
	budget: Pick<BudgetDocument, 'categoryId' | 'currency'>,
	expenses: ExpenseRow[],
	categoryMeta: Map<string, CategoryMeta>,
): number {
	const categoryId = budget.categoryId ? budget.categoryId.toString() : null;
	let filtered = expenses;

	if (categoryId) {
		const meta = categoryMeta.get(categoryId);
		if (!meta) {
			return 0;
		}
		if (meta.isSubcategory) {
			filtered = expenses.filter((txn) => txn.subcategoryId?.toString() === categoryId);
		} else {
			filtered = expenses.filter((txn) => txn.categoryId.toString() === categoryId);
		}
	}

	let total = 0;
	for (const txn of filtered) {
		total += convertAmount(txn.amount, txn.currency, budget.currency);
	}
	return Math.round(total * 100) / 100;
}

async function loadExpenses(userId: string, from: Date, to: Date): Promise<ExpenseRow[]> {
	return TransactionModel.find({
		userId,
		type: TransactionType.Expense,
		date: { $gte: from, $lte: to },
	})
		.select('amount currency categoryId subcategoryId')
		.lean();
}

export async function upsertBudget(userId: string, input: UpsertBudgetBody) {
	const userCurrency = await getUserCurrency(userId);
	const currency = input.currency ?? userCurrency;
	await assertEnabledCurrency(currency);

	const categoryId = input.categoryId ?? null;
	await assertBudgetCategory(userId, categoryId);

	let year: number | null = null;
	let month: number | null = null;
	let weekStart: Date | null = null;
	let effectiveFrom: Date;
	let effectiveTo: Date;
	let filter: Record<string, unknown>;

	if (input.periodType === BudgetPeriodType.Month) {
		year = input.year as number;
		month = input.month as number;
		({ effectiveFrom, effectiveTo } = monthWindow(year, month));
		filter = {
			userId,
			periodType: BudgetPeriodType.Month,
			year,
			month,
			categoryId,
		};
	} else {
		const window = weekWindow(input.weekStart as Date);
		weekStart = window.weekStart;
		effectiveFrom = window.effectiveFrom;
		effectiveTo = window.effectiveTo;
		filter = {
			userId,
			periodType: BudgetPeriodType.Week,
			weekStart,
			categoryId,
		};
	}

	const budget = await BudgetModel.findOneAndUpdate(
		filter,
		{
			$set: {
				periodType: input.periodType,
				categoryId,
				year,
				month,
				weekStart,
				effectiveFrom,
				effectiveTo,
				limitAmount: input.limitAmount,
				currency,
			},
		},
		{ upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
	);

	const expenses = await loadExpenses(userId, budget.effectiveFrom, budget.effectiveTo);
	const categoryMeta = await loadCategoryMeta(userId, [categoryId]);
	const spent = spentForBudget(budget, expenses, categoryMeta);
	return toPublicBudget(budget, spent, userCurrency);
}

export async function listBudgets(userId: string, query: ListBudgetsQuery) {
	const userCurrency = await getUserCurrency(userId);
	const filter: Record<string, unknown> = {
		userId,
		periodType: query.periodType,
	};

	let from: Date;
	let to: Date;

	if (query.periodType === BudgetPeriodType.Month) {
		filter.year = query.year;
		filter.month = query.month;
		({ effectiveFrom: from, effectiveTo: to } = monthWindow(query.year as number, query.month as number));
	} else {
		const window = weekWindow(query.weekStart as Date);
		filter.weekStart = window.weekStart;
		from = window.effectiveFrom;
		to = window.effectiveTo;
	}

	const budgets = await BudgetModel.find(filter).sort({ categoryId: 1, createdAt: 1 });
	if (budgets.length === 0) {
		return [];
	}

	const expenses = await loadExpenses(userId, from, to);
	const categoryMeta = await loadCategoryMeta(
		userId,
		budgets.map((b) => (b.categoryId ? b.categoryId.toString() : null)),
	);

	return budgets.map((budget) =>
		toPublicBudget(budget, spentForBudget(budget, expenses, categoryMeta), userCurrency),
	);
}

export async function deleteBudget(userId: string, budgetId: string) {
	const result = await BudgetModel.deleteOne({ _id: budgetId, userId });
	if (result.deletedCount === 0) {
		throw new AppError(messages.BUDGET_NOT_FOUND, 404);
	}
}
