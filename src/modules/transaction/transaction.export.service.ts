import ExcelJS from 'exceljs';
import { exportTransactionColumns } from '../../config/exportColumns.js';
import { ExportFormat, ExportRangePreset, TransactionType } from '../../config/enums.js';
import { limits } from '../../config/limits.js';
import { messages } from '../../config/messages.js';
import { AppError } from '../../shared/errors/AppError.js';
import { convertAmountWithCachedRates } from '../../shared/utils/aggregateFx.js';
import {
	addMonths,
	getZonedYmd,
	monthLongLabel,
	monthWindow,
	resolveTimeZone,
	type DateWindow,
} from '../../shared/utils/dateWindows.js';
import { round2 } from '../../shared/utils/money.js';
import { CategoryModel } from '../category/category.model.js';
import { UserModel } from '../user/user.model.js';
import { TransactionModel } from './transaction.model.js';
import type { ExportTransactionsQuery } from './transaction.validation.js';

const DAY_MS = 24 * 60 * 60 * 1000;

type ExportRow = {
	date: string;
	type: string;
	category: string;
	subcategory: string;
	amount: number;
	currency: string;
	amountPreferred: number;
	description: string;
};

type ExportResult = {
	buffer: Buffer;
	contentType: string;
	filename: string;
};

function escapeRegex(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatZonedDate(date: Date, timeZone: string): string {
	const ymd = getZonedYmd(date, timeZone);
	return `${ymd.year}-${String(ymd.month).padStart(2, '0')}-${String(ymd.day).padStart(2, '0')}`;
}

function assertRangeWithinLimit(from: Date, to: Date): void {
	const spanDays = Math.ceil((to.getTime() - from.getTime()) / DAY_MS) + 1;
	if (spanDays > limits.exportMaxRangeDays) {
		throw new AppError(messages.EXPORT_RANGE_TOO_LARGE, 422);
	}
}

function resolvePresetWindow(
	preset: (typeof ExportRangePreset)[keyof typeof ExportRangePreset],
	timeZone: string,
	now = new Date(),
): { window: DateWindow; label: string } {
	const today = getZonedYmd(now, timeZone);

	switch (preset) {
		case ExportRangePreset.ThisMonth: {
			const window = monthWindow(today.year, today.month, timeZone);
			return { window, label: `This month (${monthLongLabel(today.year, today.month)})` };
		}
		case ExportRangePreset.LastMonth: {
			const prev = addMonths(today.year, today.month, -1);
			const window = monthWindow(prev.year, prev.month, timeZone);
			return { window, label: `Last month (${monthLongLabel(prev.year, prev.month)})` };
		}
		case ExportRangePreset.Last3Months: {
			const start = addMonths(today.year, today.month, -2);
			return {
				window: {
					from: monthWindow(start.year, start.month, timeZone).from,
					to: monthWindow(today.year, today.month, timeZone).to,
				},
				label: 'Last 3 months',
			};
		}
		default: {
			const window = monthWindow(today.year, today.month, timeZone);
			return { window, label: `This month (${monthLongLabel(today.year, today.month)})` };
		}
	}
}

function resolveExportWindow(
	query: ExportTransactionsQuery,
	timeZone: string,
): { from: Date; to: Date; rangeLabel: string; usedPreset: string | null } {
	if (query.from && query.to) {
		assertRangeWithinLimit(query.from, query.to);
		return {
			from: query.from,
			to: query.to,
			rangeLabel: `Filtered (${formatZonedDate(query.from, timeZone)} → ${formatZonedDate(query.to, timeZone)})`,
			usedPreset: null,
		};
	}

	const preset = query.preset ?? ExportRangePreset.ThisMonth;
	const resolved = resolvePresetWindow(preset, timeZone);
	assertRangeWithinLimit(resolved.window.from, resolved.window.to);
	return {
		from: resolved.window.from,
		to: resolved.window.to,
		rangeLabel: resolved.label,
		usedPreset: preset,
	};
}

function buildFilterLines(query: ExportTransactionsQuery): string[] {
	const lines: string[] = [];
	if (query.type) lines.push(`type=${query.type}`);
	if (query.categoryId) lines.push(`categoryId=${query.categoryId}`);
	if (query.subcategoryId) lines.push(`subcategoryId=${query.subcategoryId}`);
	if (query.currency) lines.push(`currency=${query.currency}`);
	if (query.q) lines.push(`q=${query.q}`);
	if (query.minAmount !== undefined) lines.push(`minAmount=${query.minAmount}`);
	if (query.maxAmount !== undefined) lines.push(`maxAmount=${query.maxAmount}`);
	return lines;
}

function csvEscape(value: string | number): string {
	const str = String(value);
	if (/[",\n\r]/.test(str)) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return str;
}

function buildCsv(rows: ExportRow[]): Buffer {
	const header = exportTransactionColumns.join(',');
	const lines = rows.map((row) =>
		exportTransactionColumns.map((col) => csvEscape(row[col])).join(','),
	);
	return Buffer.from([header, ...lines].join('\n'), 'utf8');
}

async function buildXlsx(
	rows: ExportRow[],
	meta: {
		generatedAt: string;
		timezone: string;
		rangeLabel: string;
		preferredCurrency: string;
		filterLines: string[];
		incomeTotal: number;
		expenseTotal: number;
		net: number;
		incomeCount: number;
		expenseCount: number;
	},
): Promise<Buffer> {
	const workbook = new ExcelJS.Workbook();
	workbook.creator = 'FinTrack';
	workbook.created = new Date();

	const summary = workbook.addWorksheet('Summary');
	summary.columns = [{ width: 28 }, { width: 56 }];
	const summaryRows: Array<[string, string | number]> = [
		['FinTrack export', ''],
		['Generated', meta.generatedAt],
		['Timezone', meta.timezone],
		['Range', meta.rangeLabel],
		['Preferred currency (totals)', meta.preferredCurrency],
		['Filters', meta.filterLines.length > 0 ? meta.filterLines.join('; ') : 'None'],
		['Columns', exportTransactionColumns.join(', ')],
		['', ''],
		['Total rows', rows.length],
		['Expense count', meta.expenseCount],
		['Income count', meta.incomeCount],
		['Income total', meta.incomeTotal],
		['Expense total', meta.expenseTotal],
		['Net', meta.net],
	];
	for (const [key, value] of summaryRows) {
		summary.addRow([key, value]);
	}

	const sheet = workbook.addWorksheet('Transactions');
	sheet.columns = exportTransactionColumns.map((col) => ({
		header: col,
		key: col,
		width: col === 'description' ? 36 : 16,
	}));
	for (const row of rows) {
		sheet.addRow(row);
	}

	const arrayBuffer = await workbook.xlsx.writeBuffer();
	return Buffer.from(arrayBuffer);
}

export async function exportTransactions(
	userId: string,
	query: ExportTransactionsQuery,
): Promise<ExportResult> {
	const user = await UserModel.findById(userId).select('currency timezone');
	if (!user) {
		throw new AppError(messages.USER_NOT_FOUND, 404);
	}

	const preferred = user.currency;
	const timeZone = resolveTimeZone(user.timezone, limits.defaultTimezone);
	const { from, to, rangeLabel } = resolveExportWindow(query, timeZone);

	const filter: Record<string, unknown> = {
		userId,
		date: { $gte: from, $lte: to },
	};
	if (query.type) filter.type = query.type;
	if (query.categoryId) filter.categoryId = query.categoryId;
	if (query.subcategoryId) filter.subcategoryId = query.subcategoryId;
	if (query.currency) filter.currency = query.currency;
	if (query.minAmount !== undefined || query.maxAmount !== undefined) {
		filter.amount = {
			...(query.minAmount !== undefined ? { $gte: query.minAmount } : {}),
			...(query.maxAmount !== undefined ? { $lte: query.maxAmount } : {}),
		};
	}
	if (query.q) {
		filter.description = { $regex: escapeRegex(query.q), $options: 'i' };
	}

	const [txns, categories] = await Promise.all([
		TransactionModel.find(filter).sort({ date: -1, createdAt: -1 }).lean(),
		CategoryModel.find({ userId }).select('name').lean(),
	]);

	const categoryNames = new Map(categories.map((c) => [c._id.toString(), c.name]));
	const rateCache = new Map<string, Record<string, number>>();

	const rows: ExportRow[] = [];
	let incomeTotal = 0;
	let expenseTotal = 0;
	let incomeCount = 0;
	let expenseCount = 0;

	for (const txn of txns) {
		const amountPreferred = round2(
			await convertAmountWithCachedRates(
				txn.amount,
				txn.currency,
				preferred,
				txn.date,
				rateCache,
			),
		);
		if (txn.type === TransactionType.Income) {
			incomeTotal += amountPreferred;
			incomeCount += 1;
		} else {
			expenseTotal += amountPreferred;
			expenseCount += 1;
		}

		rows.push({
			date: formatZonedDate(txn.date, timeZone),
			type: txn.type,
			category: categoryNames.get(txn.categoryId.toString()) ?? '',
			subcategory: txn.subcategoryId
				? (categoryNames.get(txn.subcategoryId.toString()) ?? '')
				: '',
			amount: txn.amount,
			currency: txn.currency,
			amountPreferred,
			description: txn.description ?? '',
		});
	}

	incomeTotal = round2(incomeTotal);
	expenseTotal = round2(expenseTotal);
	const net = round2(incomeTotal - expenseTotal);
	const filterLines = buildFilterLines(query);
	const stamp = formatZonedDate(new Date(), timeZone);
	const baseName = `fintrack-transactions-${stamp}`;

	if (query.format === ExportFormat.Csv) {
		return {
			buffer: buildCsv(rows),
			contentType: 'text/csv; charset=utf-8',
			filename: `${baseName}.csv`,
		};
	}

	const buffer = await buildXlsx(rows, {
		generatedAt: new Date().toISOString(),
		timezone: timeZone,
		rangeLabel,
		preferredCurrency: preferred,
		filterLines,
		incomeTotal,
		expenseTotal,
		net,
		incomeCount,
		expenseCount,
	});

	return {
		buffer,
		contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		filename: `${baseName}.xlsx`,
	};
}
