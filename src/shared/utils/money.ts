export function round2(n: number): number {
	return Math.round(n * 100) / 100;
}

export function pctChange(current: number, previous: number): number | null {
	if (previous === 0) {
		return null;
	}
	return round2(((current - previous) / Math.abs(previous)) * 100);
}
