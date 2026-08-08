import { CategoryKind, TransactionType } from '../../config/enums.js';
import { limits } from '../../config/limits.js';
import { messages } from '../../config/messages.js';
import { AppError } from '../../shared/errors/AppError.js';
import { sumInPreferred } from '../../shared/utils/aggregateFx.js';
import {
	addMonths,
	getZonedYmd,
	listMonthKeys,
	monthShortLabel,
	monthWindow,
	resolveTimeZone,
	yearToDateWindow,
	type DateWindow,
} from '../../shared/utils/dateWindows.js';
import { pctChange, round2 } from '../../shared/utils/money.js';
import { CategoryModel } from '../category/category.model.js';
import { TransactionModel } from '../transaction/transaction.model.js';
import { UserModel } from '../user/user.model.js';
import { trendsRange, type GetTrendsQuery } from './trends.validation.js';

type TxnRow = {
	type: string;
	amount: number;
	currency: string;
	date: Date;
	categoryId: { toString(): string };
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

function rangeWindows(
	range: GetTrendsQuery['range'],
	timeZone: string,
	now = new Date(),
): {
	current: DateWindow & { type: string; label: string; months: Array<{ year: number; month: number; key: string }> };
	previous: DateWindow;
} {
	const today = getZonedYmd(now, timeZone);
	const labels: Record<GetTrendsQuery['range'], string> = {
		[trendsRange.Last6]: 'Last 6 months',
		[trendsRange.Last12]: 'Last 12 months',
		[trendsRange.Year]: String(today.year),
		[trendsRange.LastYear]: String(today.year - 1),
		[trendsRange.Last2y]: 'Last 24 months',
		[trendsRange.Last5y]: 'Last 60 months',
	};

	if (range === trendsRange.Year) {
		const current = yearToDateWindow(today.year, today, timeZone);
		const previous = yearToDateWindow(today.year - 1, { ...today, year: today.year - 1 }, timeZone);
		const months = listMonthKeys(today.year, 1, today.year, today.month);
		return {
			current: { ...current, type: range, label: labels[range], months },
			previous,
		};
	}

	if (range === trendsRange.LastYear) {
		const current = monthWindow(today.year - 1, 1, timeZone);
		const end = monthWindow(today.year - 1, 12, timeZone);
		const previousStart = monthWindow(today.year - 2, 1, timeZone);
		const previousEnd = monthWindow(today.year - 2, 12, timeZone);
		const months = listMonthKeys(today.year - 1, 1, today.year - 1, 12);
		return {
			current: {
				from: current.from,
				to: end.to,
				type: range,
				label: labels[range],
				months,
			},
			previous: { from: previousStart.from, to: previousEnd.to },
		};
	}

	const monthCount =
		range === trendsRange.Last6 ? 6 : range === trendsRange.Last12 ? 12 : range === trendsRange.Last2y ? 24 : 60;

	const start = addMonths(today.year, today.month, -(monthCount - 1));
	const currentFrom = monthWindow(start.year, start.month, timeZone).from;
	const currentTo = monthWindow(today.year, today.month, timeZone).to;
	const months = listMonthKeys(start.year, start.month, today.year, today.month);

	const prevEnd = addMonths(start.year, start.month, -1);
	const prevStart = addMonths(prevEnd.year, prevEnd.month, -(monthCount - 1));
	const previousFrom = monthWindow(prevStart.year, prevStart.month, timeZone).from;
	const previousTo = monthWindow(prevEnd.year, prevEnd.month, timeZone).to;

	return {
		current: {
			from: currentFrom,
			to: currentTo,
			type: range,
			label: labels[range],
			months,
		},
		previous: { from: previousFrom, to: previousTo },
	};
}

async function totalsFor(txns: TxnRow[], preferred: string) {
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

export async function getTrends(userId: string, query: GetTrendsQuery) {
	const user = await loadUser(userId);
	const preferred = user.currency;
	const timeZone = user.timezone;
	const windows = rangeWindows(query.range, timeZone);
	const includeYearInLabel = windows.current.months.length > 12;

	const spanFrom = new Date(
		Math.min(windows.previous.from.getTime(), windows.current.from.getTime()),
	);
	const spanTo = new Date(Math.max(windows.previous.to.getTime(), windows.current.to.getTime()));

	const [txns, expenseMains] = await Promise.all([
		TransactionModel.find({
			userId,
			date: { $gte: spanFrom, $lte: spanTo },
		})
			.select('type amount currency date categoryId')
			.lean() as Promise<TxnRow[]>,
		CategoryModel.find({
			userId,
			kind: CategoryKind.Expense,
			parentCategoryId: null,
		})
			.select('name')
			.sort({ name: 1 })
			.lean(),
	]);

	const categoryOptions = expenseMains.map((c) => ({
		id: c._id.toString(),
		name: c.name,
	}));
	const mainIds = new Set(categoryOptions.map((c) => c.id));

	const categoryIds = query.categoryIds ?? [];
	for (const id of categoryIds) {
		if (!mainIds.has(id)) {
			throw new AppError(messages.CATEGORY_NOT_FOUND, 422);
		}
	}

	const currentTxns = txns.filter(
		(t) =>
			t.date.getTime() >= windows.current.from.getTime() &&
			t.date.getTime() <= windows.current.to.getTime(),
	);
	const previousTxns = txns.filter(
		(t) =>
			t.date.getTime() >= windows.previous.from.getTime() &&
			t.date.getTime() <= windows.previous.to.getTime(),
	);

	const [summary, prevTotals] = await Promise.all([
		totalsFor(currentTxns, preferred),
		totalsFor(previousTxns, preferred),
	]);

	const series = [];
	for (const m of windows.current.months) {
		const inMonth = currentTxns.filter((txn) => {
			const ymd = getZonedYmd(txn.date, timeZone);
			return ymd.year === m.year && ymd.month === m.month;
		});
		const totals = await totalsFor(inMonth, preferred);
		series.push({
			month: m.key,
			label: monthShortLabel(m.year, m.month, includeYearInLabel),
			income: totals.income,
			expense: totals.expense,
			net: totals.net,
		});
	}

	const categorySeries = [];
	for (const categoryId of categoryIds) {
		const name = categoryOptions.find((c) => c.id === categoryId)?.name ?? 'Unknown';
		const points = [];
		for (const m of windows.current.months) {
			const inMonth = currentTxns.filter((txn) => {
				if (txn.type !== TransactionType.Expense || txn.categoryId.toString() !== categoryId) {
					return false;
				}
				const ymd = getZonedYmd(txn.date, timeZone);
				return ymd.year === m.year && ymd.month === m.month;
			});
			points.push({
				month: m.key,
				label: monthShortLabel(m.year, m.month, includeYearInLabel),
				amount: await sumInPreferred(inMonth, preferred),
			});
		}
		categorySeries.push({ categoryId, name, points });
	}

	return {
		range: {
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
		series,
		categoryOptions,
		categorySeries,
	};
}
