export type ZonedYmd = {
	year: number;
	month: number;
	day: number;
};

export type DateWindow = {
	from: Date;
	to: Date;
};

const MONTH_LONG = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December',
] as const;

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

function isValidTimeZone(timeZone: string): boolean {
	try {
		Intl.DateTimeFormat('en-US', { timeZone });
		return true;
	} catch {
		return false;
	}
}

export function resolveTimeZone(timeZone: string | undefined | null, fallback = 'UTC'): string {
	if (timeZone && isValidTimeZone(timeZone)) {
		return timeZone;
	}
	return fallback;
}

function getOffsetMs(date: Date, timeZone: string): number {
	const dtf = new Intl.DateTimeFormat('en-US', {
		timeZone,
		hourCycle: 'h23',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	});
	const parts = dtf.formatToParts(date);
	const map: Record<string, string> = {};
	for (const part of parts) {
		if (part.type !== 'literal') {
			map[part.type] = part.value;
		}
	}
	const asUtc = Date.UTC(
		Number(map.year),
		Number(map.month) - 1,
		Number(map.day),
		Number(map.hour),
		Number(map.minute),
		Number(map.second),
	);
	return asUtc - date.getTime();
}

export function zonedLocalToUtc(
	year: number,
	month: number,
	day: number,
	hour: number,
	minute: number,
	second: number,
	ms: number,
	timeZone: string,
): Date {
	const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second, ms));
	const offset = getOffsetMs(utcGuess, timeZone);
	let result = new Date(utcGuess.getTime() - offset);
	const offset2 = getOffsetMs(result, timeZone);
	if (offset2 !== offset) {
		result = new Date(utcGuess.getTime() - offset2);
	}
	return result;
}

export function getZonedYmd(date: Date, timeZone: string): ZonedYmd {
	const dtf = new Intl.DateTimeFormat('en-US', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	});
	const parts = dtf.formatToParts(date);
	const map: Record<string, string> = {};
	for (const part of parts) {
		if (part.type !== 'literal') {
			map[part.type] = part.value;
		}
	}
	return {
		year: Number(map.year),
		month: Number(map.month),
		day: Number(map.day),
	};
}

export function startOfZonedDay(year: number, month: number, day: number, timeZone: string): Date {
	return zonedLocalToUtc(year, month, day, 0, 0, 0, 0, timeZone);
}

export function endOfZonedDay(year: number, month: number, day: number, timeZone: string): Date {
	return zonedLocalToUtc(year, month, day, 23, 59, 59, 999, timeZone);
}

export function daysInMonth(year: number, month: number): number {
	return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
	const idx = year * 12 + (month - 1) + delta;
	return {
		year: Math.floor(idx / 12),
		month: (idx % 12) + 1,
	};
}

export function monthWindow(year: number, month: number, timeZone: string): DateWindow {
	const lastDay = daysInMonth(year, month);
	return {
		from: startOfZonedDay(year, month, 1, timeZone),
		to: endOfZonedDay(year, month, lastDay, timeZone),
	};
}

export function yearToDateWindow(year: number, today: ZonedYmd, timeZone: string): DateWindow {
	const endMonth = today.year === year ? today.month : 12;
	const endDay = today.year === year ? today.day : daysInMonth(year, 12);
	return {
		from: startOfZonedDay(year, 1, 1, timeZone),
		to: endOfZonedDay(year, endMonth, endDay, timeZone),
	};
}

export function monthKey(year: number, month: number): string {
	return `${year}-${String(month).padStart(2, '0')}`;
}

export function monthLongLabel(year: number, month: number): string {
	const name = MONTH_LONG[month - 1] ?? String(month);
	return `${name} ${year}`;
}

export function shortDateLabel(year: number, month: number, day: number): string {
	const name = MONTH_SHORT[month - 1] ?? String(month);
	return `${name} ${day}, ${year}`;
}

export function monthShortLabel(year: number, month: number, includeYear = false): string {
	const base = MONTH_SHORT[month - 1] ?? String(month);
	return includeYear ? `${base} ${String(year).slice(-2)}` : base;
}

export function listMonthKeys(fromYear: number, fromMonth: number, toYear: number, toMonth: number): Array<{
	year: number;
	month: number;
	key: string;
}> {
	const out: Array<{ year: number; month: number; key: string }> = [];
	let y = fromYear;
	let m = fromMonth;
	while (y < toYear || (y === toYear && m <= toMonth)) {
		out.push({ year: y, month: m, key: monthKey(y, m) });
		({ year: y, month: m } = addMonths(y, m, 1));
	}
	return out;
}
