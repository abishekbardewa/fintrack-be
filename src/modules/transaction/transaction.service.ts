import { Types } from 'mongoose';
import { BudgetPeriodType, TransactionType } from '../../config/enums.js';
import { limits } from '../../config/limits.js';
import { messages } from '../../config/messages.js';
import { AppError } from '../../shared/errors/AppError.js';
import { sumInPreferred } from '../../shared/utils/aggregateFx.js';
import { getZonedYmd, monthWindow, resolveTimeZone } from '../../shared/utils/dateWindows.js';
import { toAmountPreferred } from '../../shared/utils/fx.js';
import { round2 } from '../../shared/utils/money.js';
import { computeBudgetProgress } from '../budget/budget.mapper.js';
import { BudgetModel } from '../budget/budget.model.js';
import { CategoryModel } from '../category/category.model.js';
import { CurrencyModel } from '../currency/currency.model.js';
import { UserModel } from '../user/user.model.js';
import { toPublicTransaction } from './transaction.mapper.js';
import { TransactionModel } from './transaction.model.js';
import type {
	CreateTransactionBody,
	ListTransactionsQuery,
	MonthSummaryQuery,
	SuggestDescriptionsQuery,
	UpdateTransactionBody,
} from './transaction.validation.js';

type MonthSummaryTxn = {
	type: string;
	amount: number;
	currency: string;
	date: Date;
};

function formatZonedDateKey(date: Date, timeZone: string): string {
	const ymd = getZonedYmd(date, timeZone);
	return `${ymd.year}-${String(ymd.month).padStart(2, '0')}-${String(ymd.day).padStart(2, '0')}`;
}

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

async function assertCategoryForTransaction(
	userId: string,
	type: string,
	categoryId: string,
	subcategoryId: string | null | undefined,
): Promise<void> {
	const main = await CategoryModel.findOne({ _id: categoryId, userId });
	if (!main || main.parentCategoryId !== null) {
		throw new AppError(messages.TRANSACTION_CATEGORY_INVALID, 404);
	}
	if (main.kind !== type) {
		throw new AppError(messages.TRANSACTION_CATEGORY_INVALID, 422);
	}

	if (subcategoryId) {
		const sub = await CategoryModel.findOne({ _id: subcategoryId, userId });
		if (!sub || !sub.parentCategoryId || sub.parentCategoryId.toString() !== categoryId) {
			throw new AppError(messages.TRANSACTION_CATEGORY_INVALID, 404);
		}
		if (sub.kind !== type) {
			throw new AppError(messages.TRANSACTION_CATEGORY_INVALID, 422);
		}
	}
}

function escapeRegex(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function createTransaction(userId: string, input: CreateTransactionBody) {
	const userCurrency = await getUserCurrency(userId);
	const currency = input.currency ?? userCurrency;
	await assertEnabledCurrency(currency);
	await assertCategoryForTransaction(userId, input.type, input.categoryId, input.subcategoryId);

	if (input.fundedFromGoalId) {
		throw new AppError(messages.TRANSACTION_GOAL_MANAGED, 422);
	}

	const txn = await TransactionModel.create({
		userId,
		type: input.type,
		amount: input.amount,
		currency,
		categoryId: input.categoryId,
		subcategoryId: input.subcategoryId ?? null,
		description: input.description ?? '',
		date: input.date,
		fundedFromGoalId: null,
	});

	return toPublicTransaction(txn, userCurrency);
}

export async function listTransactions(userId: string, query: ListTransactionsQuery) {
	const userCurrency = await getUserCurrency(userId);
	const filter: Record<string, unknown> = { userId };

	if (query.type) filter.type = query.type;
	if (query.categoryId) filter.categoryId = query.categoryId;
	if (query.subcategoryId) filter.subcategoryId = query.subcategoryId;
	if (query.currency) filter.currency = query.currency;

	if (query.from || query.to) {
		filter.date = {
			...(query.from ? { $gte: query.from } : {}),
			...(query.to ? { $lte: query.to } : {}),
		};
	}

	if (query.minAmount !== undefined || query.maxAmount !== undefined) {
		filter.amount = {
			...(query.minAmount !== undefined ? { $gte: query.minAmount } : {}),
			...(query.maxAmount !== undefined ? { $lte: query.maxAmount } : {}),
		};
	}

	if (query.q) {
		filter.description = { $regex: escapeRegex(query.q), $options: 'i' };
	}

	const page = query.page;
	const limit = query.limit;
	const skip = (page - 1) * limit;

	const [items, total] = await Promise.all([
		TransactionModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
		TransactionModel.countDocuments(filter),
	]);

	return {
		items: await Promise.all(items.map((txn) => toPublicTransaction(txn, userCurrency))),
		page,
		limit,
		total,
		totalPages: Math.ceil(total / limit) || 0,
	};
}

export async function getTransaction(userId: string, transactionId: string) {
	const userCurrency = await getUserCurrency(userId);
	const txn = await TransactionModel.findOne({ _id: transactionId, userId });
	if (!txn) {
		throw new AppError(messages.TRANSACTION_NOT_FOUND, 404);
	}
	return toPublicTransaction(txn, userCurrency);
}

export async function updateTransaction(userId: string, transactionId: string, input: UpdateTransactionBody) {
	const existing = await TransactionModel.findOne({ _id: transactionId, userId });
	if (!existing) {
		throw new AppError(messages.TRANSACTION_NOT_FOUND, 404);
	}
	if (existing.fundedFromGoalId) {
		throw new AppError(messages.TRANSACTION_GOAL_MANAGED, 422);
	}

	const nextType = input.type ?? existing.type;
	const nextCategoryId = input.categoryId ?? existing.categoryId.toString();
	const nextSubcategoryId =
		input.subcategoryId !== undefined
			? input.subcategoryId
			: existing.subcategoryId
				? existing.subcategoryId.toString()
				: null;

	if (input.currency) {
		await assertEnabledCurrency(input.currency);
	}

	if (input.type || input.categoryId || input.subcategoryId !== undefined) {
		await assertCategoryForTransaction(userId, nextType, nextCategoryId, nextSubcategoryId);
	}

	if (input.type !== undefined) existing.type = input.type;
	if (input.amount !== undefined) existing.amount = input.amount;
	if (input.currency !== undefined) existing.currency = input.currency;
	if (input.categoryId !== undefined) existing.categoryId = new Types.ObjectId(input.categoryId);
	if (input.subcategoryId !== undefined) {
		existing.subcategoryId = input.subcategoryId ? new Types.ObjectId(input.subcategoryId) : null;
	}
	if (input.description !== undefined) existing.description = input.description;
	if (input.date !== undefined) existing.date = input.date;

	await existing.save();

	const userCurrency = await getUserCurrency(userId);
	return toPublicTransaction(existing, userCurrency);
}

export async function deleteTransaction(userId: string, transactionId: string) {
	const existing = await TransactionModel.findOne({ _id: transactionId, userId });
	if (!existing) {
		throw new AppError(messages.TRANSACTION_NOT_FOUND, 404);
	}
	if (existing.fundedFromGoalId) {
		throw new AppError(messages.TRANSACTION_GOAL_MANAGED, 422);
	}
	await TransactionModel.deleteOne({ _id: existing._id, userId });
}

export async function suggestDescriptions(userId: string, query: SuggestDescriptionsQuery) {
	const filter: Record<string, unknown> = {
		userId,
		categoryId: query.categoryId,
		description: { $nin: [null, ''] },
	};
	if (query.subcategoryId) {
		filter.subcategoryId = query.subcategoryId;
	} else {
		filter.subcategoryId = null;
	}
	if (query.type) {
		filter.type = query.type;
	}

	const rows = await TransactionModel.find(filter)
		.select('description date')
		.sort({ date: -1 })
		.limit(50)
		.lean();

	const seen = new Set<string>();
	const descriptions: string[] = [];

	for (const row of rows) {
		const raw = (row.description ?? '').trim();
		if (!raw) continue;
		const key = raw.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		descriptions.push(raw);
		if (descriptions.length >= limits.suggestDescriptionsLimit) break;
	}

	if (descriptions.length === 0 && query.subcategoryId) {
		return suggestDescriptions(userId, {
			categoryId: query.categoryId,
			type: query.type,
		});
	}

	return descriptions;
}

export async function getMonthSummary(userId: string, query: MonthSummaryQuery) {
	const user = await UserModel.findById(userId).select('currency timezone');
	if (!user) {
		throw new AppError(messages.USER_NOT_FOUND, 404);
	}

	const preferred = user.currency;
	const timeZone = resolveTimeZone(user.timezone, limits.defaultTimezone);
	const { year, month } = query;
	const { from, to } = monthWindow(year, month, timeZone);

	const [txns, overallBudget] = await Promise.all([
		TransactionModel.find({
			userId,
			date: { $gte: from, $lte: to },
		})
			.select('type amount currency date')
			.lean() as Promise<MonthSummaryTxn[]>,
		BudgetModel.findOne({
			userId,
			periodType: BudgetPeriodType.Month,
			year,
			month,
			categoryId: null,
		}).lean(),
	]);

	const byDay = new Map<string, MonthSummaryTxn[]>();
	for (const txn of txns) {
		const key = formatZonedDateKey(txn.date, timeZone);
		const list = byDay.get(key);
		if (list) {
			list.push(txn);
		} else {
			byDay.set(key, [txn]);
		}
	}

	const [spent, income] = await Promise.all([
		sumInPreferred(
			txns.filter((t) => t.type === TransactionType.Expense),
			preferred,
		),
		sumInPreferred(
			txns.filter((t) => t.type === TransactionType.Income),
			preferred,
		),
	]);

	const dayKeys = [...byDay.keys()].sort();
	const days = await Promise.all(
		dayKeys.map(async (date) => {
			const rows = byDay.get(date) ?? [];
			const [daySpent, dayIncome] = await Promise.all([
				sumInPreferred(
					rows.filter((t) => t.type === TransactionType.Expense),
					preferred,
				),
				sumInPreferred(
					rows.filter((t) => t.type === TransactionType.Income),
					preferred,
				),
			]);
			return {
				date,
				spent: daySpent,
				income: dayIncome,
				count: rows.length,
			};
		}),
	);

	let budget = null;
	if (overallBudget) {
		const limit = round2(
			await toAmountPreferred(overallBudget.limitAmount, overallBudget.currency, preferred),
		);
		const progress = computeBudgetProgress(limit, spent);
		budget = {
			id: overallBudget._id.toString(),
			limit,
			spent,
			remaining: progress.remaining,
			percent: progress.percent,
			status: progress.status,
		};
	}

	return {
		year,
		month,
		currency: preferred,
		monthTotals: {
			spent,
			income,
			count: txns.length,
		},
		days,
		budget,
	};
}
