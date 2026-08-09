import { BudgetPeriodType, SavingsGoalStatus, TransactionType } from '../../config/enums.js';
import { limits } from '../../config/limits.js';
import { messages } from '../../config/messages.js';
import { AppError } from '../../shared/errors/AppError.js';
import { convertAmountWithCachedRates, sumInPreferred } from '../../shared/utils/aggregateFx.js';
import {
	addMonths,
	daysInMonth,
	getZonedYmd,
	listMonthKeys,
	monthKey,
	monthLongLabel,
	monthShortLabel,
	monthWindow,
	resolveTimeZone,
	startOfZonedDay,
	yearToDateWindow,
	type DateWindow,
} from '../../shared/utils/dateWindows.js';
import { pctChange, round2 } from '../../shared/utils/money.js';
import { computeBudgetProgress } from '../budget/budget.mapper.js';
import { BudgetModel } from '../budget/budget.model.js';
import { CategoryModel } from '../category/category.model.js';
import { SavingsGoalModel } from '../savings-goal/savings-goal.model.js';
import { TransactionModel } from '../transaction/transaction.model.js';
import { UserModel } from '../user/user.model.js';
import { dashboardPeriod, type GetDashboardQuery } from './dashboard.validation.js';

type TxnRow = {
	_id: { toString(): string };
	type: string;
	amount: number;
	currency: string;
	date: Date;
	categoryId: { toString(): string };
	subcategoryId?: { toString(): string } | null;
	description?: string | null;
};

type CategoryRow = {
	_id: { toString(): string };
	name: string;
	parentCategoryId?: { toString(): string } | null;
};

type CategorySlice = {
	categoryId: string | null;
	name: string;
	amount: number;
	percent: number;
};

async function loadUser(userId: string) {
	const user = await UserModel.findById(userId).select('currency timezone');
	if (!user) {
		throw new AppError(messages.USER_NOT_FOUND, 404);
	}
	return {
		currency: user.currency,
		timezone: resolveTimeZone(user.timezone, limits.defaultTimezone),
	};
}

async function loadTransactions(userId: string, from: Date, to: Date): Promise<TxnRow[]> {
	return TransactionModel.find({
		userId,
		date: { $gte: from, $lte: to },
	})
		.select('type amount currency date categoryId subcategoryId description')
		.lean();
}

async function totalsFor(
	txns: TxnRow[],
	preferred: string,
): Promise<{ income: number; expense: number; net: number }> {
	const [income, expense] = await Promise.all([
		sumInPreferred(
			txns.filter((t) => t.type === TransactionType.Income),
			preferred,
		),
		sumInPreferred(
			txns.filter((t) => t.type === TransactionType.Expense),
			preferred,
		),
	]);
	return { income, expense, net: round2(income - expense) };
}

async function expenseByCategory(
	expenses: TxnRow[],
	categories: Map<string, CategoryRow>,
	preferred: string,
	topN: number,
): Promise<CategorySlice[]> {
	const buckets = new Map<string, TxnRow[]>();
	for (const txn of expenses) {
		const id = txn.categoryId.toString();
		const list = buckets.get(id);
		if (list) {
			list.push(txn);
		} else {
			buckets.set(id, [txn]);
		}
	}

	const amounts: Array<{ categoryId: string; name: string; amount: number }> = [];
	for (const [categoryId, rows] of buckets.entries()) {
		const amount = await sumInPreferred(rows, preferred);
		if (amount <= 0) {
			continue;
		}
		amounts.push({
			categoryId,
			name: categories.get(categoryId)?.name ?? 'Unknown',
			amount,
		});
	}

	amounts.sort((a, b) => b.amount - a.amount);
	const totalExpense = amounts.reduce((sum, row) => sum + row.amount, 0);
	if (totalExpense <= 0) {
		return [];
	}

	const top = amounts.slice(0, topN);
	const rest = amounts.slice(topN);
	const slices: CategorySlice[] = top.map((row) => ({
		categoryId: row.categoryId,
		name: row.name,
		amount: row.amount,
		percent: round2((row.amount / totalExpense) * 100),
	}));

	if (rest.length > 0) {
		const otherAmount = round2(rest.reduce((sum, row) => sum + row.amount, 0));
		slices.push({
			categoryId: null,
			name: 'Other',
			amount: otherAmount,
			percent: round2((otherAmount / totalExpense) * 100),
		});
	}

	return slices;
}

async function buildCashFlowMonth(
	txns: TxnRow[],
	year: number,
	month: number,
	timeZone: string,
	preferred: string,
) {
	const lastDay = daysInMonth(year, month);
	const byDay = new Map<number, TxnRow[]>();
	for (let day = 1; day <= lastDay; day++) {
		byDay.set(day, []);
	}
	for (const txn of txns) {
		const ymd = getZonedYmd(txn.date, timeZone);
		if (ymd.year === year && ymd.month === month) {
			byDay.get(ymd.day)?.push(txn);
		}
	}

	const points = [];
	for (let day = 1; day <= lastDay; day++) {
		const rows = byDay.get(day) ?? [];
		const [income, expense] = await Promise.all([
			sumInPreferred(
				rows.filter((r) => r.type === TransactionType.Income),
				preferred,
			),
			sumInPreferred(
				rows.filter((r) => r.type === TransactionType.Expense),
				preferred,
			),
		]);
		points.push({
			date: startOfZonedDay(year, month, day, timeZone).toISOString(),
			label: String(day),
			income,
			expense,
		});
	}
	return points;
}

async function buildCashFlowYear(
	txns: TxnRow[],
	year: number,
	throughMonth: number,
	timeZone: string,
	preferred: string,
) {
	const months = listMonthKeys(year, 1, year, throughMonth);
	const points = [];

	for (const m of months) {
		const inMonth = txns.filter((txn) => {
			const ymd = getZonedYmd(txn.date, timeZone);
			return ymd.year === m.year && ymd.month === m.month;
		});
		const [income, expense] = await Promise.all([
			sumInPreferred(
				inMonth.filter((r) => r.type === TransactionType.Income),
				preferred,
			),
			sumInPreferred(
				inMonth.filter((r) => r.type === TransactionType.Expense),
				preferred,
			),
		]);
		points.push({
			date: startOfZonedDay(m.year, m.month, 1, timeZone).toISOString(),
			label: monthShortLabel(m.year, m.month),
			income,
			expense,
		});
	}
	return points;
}

async function loadCategoryMap(userId: string): Promise<Map<string, CategoryRow>> {
	const rows = await CategoryModel.find({ userId }).select('name parentCategoryId').lean();
	const map = new Map<string, CategoryRow>();
	for (const row of rows) {
		map.set(row._id.toString(), row);
	}
	return map;
}

async function buildBudgets(userId: string, year: number, month: number, preferred: string, timeZone: string) {
	const { from, to } = monthWindow(year, month, timeZone);
	const budgets = await BudgetModel.find({
		userId,
		periodType: BudgetPeriodType.Month,
		year,
		month,
	}).sort({ categoryId: 1, createdAt: 1 });

	if (budgets.length === 0) {
		return [];
	}

	const expenses = await TransactionModel.find({
		userId,
		type: TransactionType.Expense,
		date: { $gte: from, $lte: to },
	})
		.select('amount currency date categoryId subcategoryId')
		.lean();

	const categoryIds = budgets
		.map((b) => (b.categoryId ? b.categoryId.toString() : null))
		.filter((id): id is string => Boolean(id));
	const categoryDocs = await CategoryModel.find({ _id: { $in: categoryIds }, userId })
		.select('name parentCategoryId')
		.lean();
	const categoryMeta = new Map(
		categoryDocs.map((c) => [
			c._id.toString(),
			{ name: c.name, isSubcategory: c.parentCategoryId != null },
		]),
	);

	const rateCache = new Map<string, Record<string, number>>();
	const result = [];

	for (const budget of budgets) {
		const categoryId = budget.categoryId ? budget.categoryId.toString() : null;
		let filtered = expenses;
		if (categoryId) {
			const meta = categoryMeta.get(categoryId);
			if (!meta) {
				continue;
			}
			filtered = meta.isSubcategory
				? expenses.filter((txn) => txn.subcategoryId?.toString() === categoryId)
				: expenses.filter((txn) => txn.categoryId.toString() === categoryId);
		}

		let spentPreferred = 0;
		for (const txn of filtered) {
			spentPreferred += await convertAmountWithCachedRates(
				txn.amount,
				txn.currency,
				preferred,
				txn.date,
				rateCache,
			);
		}
		spentPreferred = round2(spentPreferred);

		const limitPreferred = round2(
			await convertAmountWithCachedRates(
				budget.limitAmount,
				budget.currency,
				preferred,
				new Date(),
				rateCache,
			),
		);
		const progress = computeBudgetProgress(limitPreferred, spentPreferred);

		result.push({
			id: budget._id.toString(),
			categoryId,
			name: categoryId ? (categoryMeta.get(categoryId)?.name ?? 'Category') : 'Overall',
			limit: limitPreferred,
			spent: spentPreferred,
			remaining: progress.remaining,
			percent: progress.percent,
			status: progress.status,
		});
	}

	return result;
}

async function buildGoals(userId: string, preferred: string, timeZone: string) {
	const goals = await SavingsGoalModel.find({ userId, status: SavingsGoalStatus.Active })
		.sort({ createdAt: -1 })
		.limit(3)
		.lean();

	const rateCache = new Map<string, Record<string, number>>();
	const today = getZonedYmd(new Date(), timeZone);
	const todayStart = startOfZonedDay(today.year, today.month, today.day, timeZone);

	const out = [];
	for (const goal of goals) {
		const current = round2(
			await convertAmountWithCachedRates(
				goal.currentAmount,
				goal.currency,
				preferred,
				new Date(),
				rateCache,
			),
		);
		const target = round2(
			await convertAmountWithCachedRates(
				goal.targetAmount,
				goal.currency,
				preferred,
				new Date(),
				rateCache,
			),
		);
		const percent = target > 0 ? round2(Math.min(100, (current / target) * 100)) : 0;
		const remaining = round2(Math.max(0, target - current));

		let targetDate: string | null = null;
		let daysLeft: number | null = null;
		if (goal.targetDate) {
			const ymd = getZonedYmd(goal.targetDate, timeZone);
			targetDate = `${ymd.year}-${String(ymd.month).padStart(2, '0')}-${String(ymd.day).padStart(2, '0')}`;
			const targetStart = startOfZonedDay(ymd.year, ymd.month, ymd.day, timeZone);
			daysLeft = Math.ceil((targetStart.getTime() - todayStart.getTime()) / (24 * 60 * 60 * 1000));
		}

		out.push({
			id: goal._id.toString(),
			name: goal.name,
			current,
			target,
			remaining,
			percent,
			targetDate,
			daysLeft,
		});
	}
	return out;
}

async function buildRecent(userId: string, preferred: string, categories: Map<string, CategoryRow>) {
	const rows = await TransactionModel.find({ userId })
		.sort({ date: -1 })
		.limit(limits.dashboardRecentTransactions)
		.select('type amount currency date categoryId description')
		.lean();

	const rateCache = new Map<string, Record<string, number>>();
	const out = [];
	for (const row of rows) {
		const amount = round2(
			await convertAmountWithCachedRates(row.amount, row.currency, preferred, row.date, rateCache),
		);
		out.push({
			id: row._id.toString(),
			type: row.type,
			description: row.description ?? '',
			categoryName: categories.get(row.categoryId.toString())?.name ?? 'Unknown',
			amount,
			date: row.date.toISOString(),
		});
	}
	return out;
}

function periodWindows(
	period: GetDashboardQuery['period'],
	timeZone: string,
	now = new Date(),
): {
	current: DateWindow & { type: string; label: string; year: number; month: number };
	previous: DateWindow;
	compareA: DateWindow & { key: string; label: string };
	compareB: DateWindow & { key: string; label: string };
} {
	const today = getZonedYmd(now, timeZone);

	if (period === dashboardPeriod.Month) {
		const current = monthWindow(today.year, today.month, timeZone);
		const prev = addMonths(today.year, today.month, -1);
		const previous = monthWindow(prev.year, prev.month, timeZone);
		return {
			current: {
				...current,
				type: dashboardPeriod.Month,
				label: monthLongLabel(today.year, today.month),
				year: today.year,
				month: today.month,
			},
			previous,
			compareA: {
				...previous,
				key: monthKey(prev.year, prev.month),
				label: monthShortLabel(prev.year, prev.month, true),
			},
			compareB: {
				...current,
				key: monthKey(today.year, today.month),
				label: monthShortLabel(today.year, today.month, true),
			},
		};
	}

	const current = yearToDateWindow(today.year, today, timeZone);
	const prevToday = { year: today.year - 1, month: today.month, day: today.day };
	const previous = yearToDateWindow(today.year - 1, prevToday, timeZone);
	return {
		current: {
			...current,
			type: dashboardPeriod.Year,
			label: String(today.year),
			year: today.year,
			month: today.month,
		},
		previous,
		compareA: {
			...previous,
			key: String(today.year - 1),
			label: String(today.year - 1),
		},
		compareB: {
			...current,
			key: String(today.year),
			label: String(today.year),
		},
	};
}

export async function getDashboard(userId: string, query: GetDashboardQuery) {
	const user = await loadUser(userId);
	const preferred = user.currency;
	const timeZone = user.timezone;
	const today = getZonedYmd(new Date(), timeZone);
	const windows = periodWindows(query.period, timeZone);

	const spanFrom = new Date(
		Math.min(windows.previous.from.getTime(), windows.current.from.getTime()),
	);
	const spanTo = new Date(Math.max(windows.previous.to.getTime(), windows.current.to.getTime()));

	const [allTxns, categories] = await Promise.all([
		loadTransactions(userId, spanFrom, spanTo),
		loadCategoryMap(userId),
	]);

	const inWindow = (from: Date, to: Date) =>
		allTxns.filter((t) => t.date.getTime() >= from.getTime() && t.date.getTime() <= to.getTime());

	const currentTxns = inWindow(windows.current.from, windows.current.to);
	const previousTxns = inWindow(windows.previous.from, windows.previous.to);
	const compareATxns = inWindow(windows.compareA.from, windows.compareA.to);
	const compareBTxns = inWindow(windows.compareB.from, windows.compareB.to);

	const [summary, prevTotals, compareATotals, compareBTotals] = await Promise.all([
		totalsFor(currentTxns, preferred),
		totalsFor(previousTxns, preferred),
		totalsFor(compareATxns, preferred),
		totalsFor(compareBTxns, preferred),
	]);

	const [byCategory, compareAByCat, compareBByCat, cashFlow, budgets, goals, recentTransactions] =
		await Promise.all([
			expenseByCategory(
				currentTxns.filter((t) => t.type === TransactionType.Expense),
				categories,
				preferred,
				limits.dashboardCategoryTopN,
			),
			expenseByCategory(
				compareATxns.filter((t) => t.type === TransactionType.Expense),
				categories,
				preferred,
				limits.dashboardCategoryTopN,
			),
			expenseByCategory(
				compareBTxns.filter((t) => t.type === TransactionType.Expense),
				categories,
				preferred,
				limits.dashboardCategoryTopN,
			),
			query.period === dashboardPeriod.Month
				? buildCashFlowMonth(
						currentTxns,
						windows.current.year,
						windows.current.month,
						timeZone,
						preferred,
					)
				: buildCashFlowYear(
						currentTxns,
						windows.current.year,
						windows.current.month,
						timeZone,
						preferred,
					),
			buildBudgets(userId, today.year, today.month, preferred, timeZone),
			buildGoals(userId, preferred, timeZone),
			buildRecent(userId, preferred, categories),
		]);

	return {
		period: {
			type: windows.current.type,
			from: windows.current.from.toISOString(),
			to: windows.current.to.toISOString(),
			label: windows.current.label,
		},
		currency: preferred,
		summary: {
			income: summary.income,
			expense: summary.expense,
			net: summary.net,
			savingsRate: summary.income > 0 ? round2((summary.net / summary.income) * 100) : null,
			vsPrevious: {
				incomePct: pctChange(summary.income, prevTotals.income),
				expensePct: pctChange(summary.expense, prevTotals.expense),
				netPct: pctChange(summary.net, prevTotals.net),
			},
		},
		cashFlow,
		byCategory,
		categoryCompare: {
			a: {
				key: windows.compareA.key,
				label: windows.compareA.label,
				income: compareATotals.income,
				expense: compareATotals.expense,
				net: compareATotals.net,
				byCategory: compareAByCat,
			},
			b: {
				key: windows.compareB.key,
				label: windows.compareB.label,
				income: compareBTotals.income,
				expense: compareBTotals.expense,
				net: compareBTotals.net,
				byCategory: compareBByCat,
			},
		},
		budgets,
		goals,
		recentTransactions,
	};
}
