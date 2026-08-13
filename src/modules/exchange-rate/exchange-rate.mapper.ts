import {
	ExchangeRateStatus,
	type ExchangeRateProcessValue,
	type ExchangeRateSourceValue,
	type ExchangeRateStatusValue,
} from '../../config/enums.js';
import type { ExchangeRateDocument } from './exchange-rate.model.js';

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
	process: ExchangeRateProcessValue | string;
	triggeredBy: string;
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
		| 'process'
		| 'triggeredBy'
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
		process: doc.process,
		triggeredBy: doc.triggeredBy,
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
