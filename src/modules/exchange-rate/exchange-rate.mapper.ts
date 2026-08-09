import { ExchangeRateStatus, type ExchangeRateSourceValue, type ExchangeRateStatusValue } from '../../config/enums.js';
import type { ExchangeRateDocument } from './exchange-rate.model.js';
import type { FxSyncLogDocument } from './fx-sync-log.model.js';

function ratesToObject(rates: Map<string, number> | Record<string, number> | undefined): Record<string, number> {
	if (!rates) {
		return {};
	}
	if (rates instanceof Map) {
		return Object.fromEntries([...rates.entries()].map(([k, v]) => [k.toUpperCase(), v]));
	}
	const out: Record<string, number> = {};
	for (const [k, v] of Object.entries(rates)) {
		out[k.toUpperCase()] = v;
	}
	return out;
}

export type PublicExchangeRate = {
	id: string;
	date: string;
	base: string;
	rates: Record<string, number>;
	fetchedAt: Date;
	source: ExchangeRateSourceValue | string;
	status: ExchangeRateStatusValue | string;
	attemptCount: number;
	lastError: { message: string; at: Date } | null;
	notes: string | null;
	updatedBy: string | null;
	createdAt?: Date;
	updatedAt?: Date;
};

export function toPublicExchangeRate(
	doc: Pick<
		ExchangeRateDocument,
		| 'date'
		| 'base'
		| 'rates'
		| 'fetchedAt'
		| 'source'
		| 'status'
		| 'attemptCount'
		| 'lastError'
		| 'notes'
		| 'updatedBy'
		| 'createdAt'
		| 'updatedAt'
	> & { _id: { toString(): string } },
): PublicExchangeRate {
	return {
		id: doc._id.toString(),
		date: doc.date,
		base: doc.base,
		rates: ratesToObject(doc.rates as Map<string, number> | Record<string, number>),
		fetchedAt: doc.fetchedAt,
		source: doc.source,
		status: doc.status ?? ExchangeRateStatus.Ok,
		attemptCount: doc.attemptCount ?? 1,
		lastError: doc.lastError
			? {
					message: doc.lastError.message,
					at: doc.lastError.at,
				}
			: null,
		notes: doc.notes ?? null,
		updatedBy: doc.updatedBy ?? null,
		createdAt: doc.createdAt,
		updatedAt: doc.updatedAt,
	};
}

export type PublicFxSyncLog = {
	id: string;
	type: string;
	date: string | null;
	success: boolean;
	error: string | null;
	triggeredBy: string;
	startedAt: Date;
	finishedAt: Date;
	createdAt?: Date;
};

export function toPublicFxSyncLog(
	doc: Pick<
		FxSyncLogDocument,
		'type' | 'date' | 'success' | 'error' | 'triggeredBy' | 'startedAt' | 'finishedAt' | 'createdAt'
	> & { _id: { toString(): string } },
): PublicFxSyncLog {
	return {
		id: doc._id.toString(),
		type: doc.type,
		date: doc.date ?? null,
		success: doc.success,
		error: doc.error ?? null,
		triggeredBy: doc.triggeredBy,
		startedAt: doc.startedAt,
		finishedAt: doc.finishedAt,
		createdAt: doc.createdAt,
	};
}
