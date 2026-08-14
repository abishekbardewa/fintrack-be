import ExcelJS from 'exceljs';
import {
	exportTransactionColumnLabels,
	exportTransactionColumnWidths,
	exportTransactionColumns,
} from '../../config/exportColumns.js';
import { ExportFormat, ExportRangePreset, TransactionType } from '../../config/enums.js';
import { limits } from '../../config/limits.js';
import { messages } from '../../config/messages.js';
import { AppError } from '../../shared/errors/AppError.js';
import { convertAmountWithCachedRates } from '../../shared/utils/aggregateFx.js';
import {
	addMonths,
	getZonedYmd,
	monthLongLabel,
	monthShortLabel,
	monthWindow,
	resolveTimeZone,
	shortDateLabel,
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

function formatDisplayDate(date: Date, timeZone: string): string {
	const ymd = getZonedYmd(date, timeZone);
	return shortDateLabel(ymd.year, ymd.month, ymd.day);
}

function formatAmount(value: number): string {
	return value.toLocaleString('en-US', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

function amountNumFmt(currency: string): string {
	return `#,##0.00" ${currency}"`;
}

function slugifyMonth(year: number, month: number): string {
	return `${monthShortLabel(year, month).toLowerCase()}-${year}`;
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
): { window: DateWindow; label: string; slug: string } {
	const today = getZonedYmd(now, timeZone);

	switch (preset) {
		case ExportRangePreset.LastMonth: {
			const prev = addMonths(today.year, today.month, -1);
			const window = monthWindow(prev.year, prev.month, timeZone);
			return {
				window,
				label: `Last month (${monthLongLabel(prev.year, prev.month)})`,
				slug: `last-month-${slugifyMonth(prev.year, prev.month)}`,
			};
		}
		case ExportRangePreset.Last3Months: {
			const start = addMonths(today.year, today.month, -2);
			return {
				window: {
					from: monthWindow(start.year, start.month, timeZone).from,
					to: monthWindow(today.year, today.month, timeZone).to,
				},
				label: 'Last 3 months',
				slug: `last-3-months-${slugifyMonth(start.year, start.month)}-to-${slugifyMonth(today.year, today.month)}`,
			};
		}
		default: {
			const window = monthWindow(today.year, today.month, timeZone);
			return {
				window,
				label: `This month (${monthLongLabel(today.year, today.month)})`,
				slug: `this-month-${slugifyMonth(today.year, today.month)}`,
			};
		}
	}
}

function resolveExportWindow(
	query: ExportTransactionsQuery,
	timeZone: string,
): { from: Date; to: Date; rangeLabel: string; rangeSlug: string; usedPreset: string | null } {
	if (query.from && query.to) {
		assertRangeWithinLimit(query.from, query.to);
		const fromLabel = formatZonedDate(query.from, timeZone);
		const toLabel = formatZonedDate(query.to, timeZone);
		return {
			from: query.from,
			to: query.to,
			rangeLabel: `Filtered (${fromLabel} → ${toLabel})`,
			rangeSlug: `${fromLabel}-to-${toLabel}`,
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
		rangeSlug: resolved.slug,
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

function buildCsv(rows: ExportRow[], preferredCurrency: string): Buffer {
	const header = exportTransactionColumns
		.map((col) => csvEscape(exportTransactionColumnLabels[col]))
		.join(',');
	const lines = rows.map((row) =>
		exportTransactionColumns
			.map((col) => {
				if (col === 'amount') {
					return csvEscape(`${formatAmount(row.amount)} ${row.currency}`);
				}
				if (col === 'amountPreferred') {
					return csvEscape(`${formatAmount(row.amountPreferred)} ${preferredCurrency}`);
				}
				return csvEscape(row[col]);
			})
			.join(','),
	);
	return Buffer.from([header, ...lines].join('\n'), 'utf8');
}

const HEADER_FILL_COLOR = 'FF1F3864';
const BAND_FILL_COLOR = 'FFF2F5FA';

async function buildXlsx(
	rows: ExportRow[],
	meta: {
		generatedDate: string;
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

	const preferredFmt = amountNumFmt(meta.preferredCurrency);
	const summary = workbook.addWorksheet('Summary');
	summary.columns = [{ width: 24 }, { width: 52 }];

	const titleRow = summary.addRow(['FinTrack Export']);
	titleRow.height = 24;
	titleRow.getCell(1).font = { bold: true, size: 16, color: { argb: HEADER_FILL_COLOR } };
	summary.addRow([]);

	const summaryRows: Array<{ label: string; value: string | number; numFmt?: string }> = [
		{ label: 'Generated Date', value: meta.generatedDate },
		{ label: 'Range', value: meta.rangeLabel },
		{ label: 'Currency', value: meta.preferredCurrency },
		{
			label: 'Filters',
			value: meta.filterLines.length > 0 ? meta.filterLines.join('; ') : 'None',
		},
		{ label: '', value: '' },
		{ label: 'Transaction Count', value: rows.length, numFmt: '#,##0' },
		{ label: 'Expense Count', value: meta.expenseCount, numFmt: '#,##0' },
		{ label: 'Income Count', value: meta.incomeCount, numFmt: '#,##0' },
		{ label: '', value: '' },
		{ label: 'Income Total', value: meta.incomeTotal, numFmt: preferredFmt },
		{ label: 'Expense Total', value: meta.expenseTotal, numFmt: preferredFmt },
		{ label: 'Net', value: meta.net, numFmt: preferredFmt },
	];

	for (const { label, value, numFmt } of summaryRows) {
		const row = summary.addRow([label, value]);
		row.getCell(1).font = { bold: true };
		const valueCell = row.getCell(2);
		valueCell.alignment = { horizontal: 'left' };
		if (numFmt) {
			valueCell.numFmt = numFmt;
		}
	}

	const sheet = workbook.addWorksheet('Transactions');
	sheet.columns = exportTransactionColumns.map((col) => ({
		header: exportTransactionColumnLabels[col],
		key: col,
		width: exportTransactionColumnWidths[col],
	}));

	const headerRow = sheet.getRow(1);
	headerRow.height = 20;
	headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
	headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL_COLOR } };
	headerRow.alignment = { vertical: 'middle' };
	sheet.views = [{ state: 'frozen', ySplit: 1 }];
	sheet.autoFilter = {
		from: { row: 1, column: 1 },
		to: { row: 1, column: exportTransactionColumns.length },
	};

	for (const [index, row] of rows.entries()) {
		const added = sheet.addRow(row);
		added.getCell('amount').numFmt = amountNumFmt(row.currency);
		added.getCell('amountPreferred').numFmt = preferredFmt;
		if (index % 2 === 1) {
			added.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BAND_FILL_COLOR } };
		}
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
	const { from, to, rangeLabel, rangeSlug } = resolveExportWindow(query, timeZone);

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
			date: formatDisplayDate(txn.date, timeZone),
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
	const baseName = `fintrack-transactions-${rangeSlug}`;

	if (query.format === ExportFormat.Csv) {
		return {
			buffer: buildCsv(rows, preferred),
			contentType: 'text/csv; charset=utf-8',
			filename: `${baseName}.csv`,
		};
	}

	const buffer = await buildXlsx(rows, {
		generatedDate: formatDisplayDate(new Date(), timeZone),
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
