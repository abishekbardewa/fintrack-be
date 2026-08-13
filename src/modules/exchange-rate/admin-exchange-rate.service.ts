import {
	ExchangeRateProcess,
	ExchangeRateSource,
	ExchangeRateStatus,
} from '../../config/enums.js';
import { limits } from '../../config/limits.js';
import { messages } from '../../config/messages.js';
import { AppError } from '../../shared/errors/AppError.js';
import { toPublicExchangeRate } from './exchange-rate.mapper.js';
import { ExchangeRateModel } from './exchange-rate.model.js';
import {
	clearExchangeRateMemoryCache,
	syncExchangeRatesForDate,
	toRateDateKey,
} from './exchange-rate.service.js';
import type {
	CreateExchangeRateBody,
	ListExchangeRatesQuery,
	UpdateExchangeRateBody,
} from './exchange-rate.validation.js';

export async function listExchangeRates(query: ListExchangeRatesQuery) {
	const filter: Record<string, unknown> = {};
	if (query.from || query.to) {
		filter.date = {
			...(query.from ? { $gte: query.from } : {}),
			...(query.to ? { $lte: query.to } : {}),
		};
	}
	if (query.status) {
		filter.status = query.status;
	}
	if (query.process) {
		filter.process = query.process;
	}

	const skip = (query.page - 1) * query.limit;
	const [rows, total] = await Promise.all([
		ExchangeRateModel.find(filter).sort({ date: -1 }).skip(skip).limit(query.limit),
		ExchangeRateModel.countDocuments(filter),
	]);

	return {
		items: rows.map((row) => toPublicExchangeRate(row)),
		page: query.page,
		limit: query.limit,
		total,
		base: limits.systemBaseCurrency,
		source: ExchangeRateSource.Frankfurter,
	};
}

export async function getExchangeRateByDate(date: string) {
	const doc = await ExchangeRateModel.findOne({ date });
	if (!doc) {
		throw new AppError(messages.EXCHANGE_RATE_NOT_FOUND, 404);
	}
	return toPublicExchangeRate(doc);
}

export async function createExchangeRate(adminName: string, input: CreateExchangeRateBody) {
	const existing = await ExchangeRateModel.findOne({ date: input.date }).lean();
	if (existing) {
		throw new AppError(messages.VALIDATION_FAILED, 409, [
			{ field: 'date', message: 'Exchange rate for this date already exists' },
		]);
	}

	if (!input.rates) {
		const ok = await syncExchangeRatesForDate(input.date, {
			maxAttempts: 1,
			retryDelayMs: 0,
			process: ExchangeRateProcess.AdminSync,
			triggeredBy: adminName,
		});
		if (!ok) {
			throw new AppError(messages.EXCHANGE_RATE_SYNC_FAILED, 502);
		}

		if (input.notes !== undefined && input.notes !== null) {
			await ExchangeRateModel.updateOne(
				{ date: input.date },
				{ $set: { notes: input.notes, updatedBy: adminName } },
			);
		}

		return getExchangeRateByDate(input.date);
	}

	const rates = { ...input.rates, [limits.systemBaseCurrency]: 1 };
	const now = new Date();
	const doc = await ExchangeRateModel.create({
		date: input.date,
		base: input.base || limits.systemBaseCurrency,
		rates,
		fetchedAt: now,
		source: ExchangeRateSource.Frankfurter,
		status: ExchangeRateStatus.Ok,
		process: ExchangeRateProcess.AdminManual,
		triggeredBy: adminName,
		attemptCount: 1,
		lastError: null,
		notes: input.notes ?? null,
		updatedBy: adminName,
	});
	clearExchangeRateMemoryCache(input.date);
	return toPublicExchangeRate(doc);
}

export async function updateExchangeRate(adminName: string, date: string, input: UpdateExchangeRateBody) {
	const doc = await ExchangeRateModel.findOne({ date });
	if (!doc) {
		throw new AppError(messages.EXCHANGE_RATE_NOT_FOUND, 404);
	}

	if (input.rates) {
		doc.set('rates', { ...input.rates, [limits.systemBaseCurrency]: 1 });
		doc.source = ExchangeRateSource.Frankfurter;
		doc.status = ExchangeRateStatus.Ok;
		doc.process = ExchangeRateProcess.AdminManual;
		doc.triggeredBy = adminName;
		doc.fetchedAt = new Date();
		doc.attemptCount = 1;
		doc.lastError = null;
	}
	if (input.notes !== undefined) {
		doc.notes = input.notes ?? null;
	}
	doc.updatedBy = adminName;
	await doc.save();
	clearExchangeRateMemoryCache(date);
	return toPublicExchangeRate(doc);
}

export async function deleteExchangeRate(date: string) {
	const result = await ExchangeRateModel.deleteOne({ date });
	if (result.deletedCount === 0) {
		throw new AppError(messages.EXCHANGE_RATE_NOT_FOUND, 404);
	}
	clearExchangeRateMemoryCache(date);
}

export async function retryExchangeRate(adminName: string, date: string) {
	const ok = await syncExchangeRatesForDate(date, {
		maxAttempts: 1,
		retryDelayMs: 0,
		process: ExchangeRateProcess.AdminRetry,
		triggeredBy: adminName,
	});
	if (!ok) {
		throw new AppError(messages.EXCHANGE_RATE_SYNC_FAILED, 502);
	}
	return getExchangeRateByDate(date);
}

export async function syncTodayExchangeRate(adminName: string) {
	const date = toRateDateKey();
	const ok = await syncExchangeRatesForDate(date, {
		maxAttempts: 1,
		retryDelayMs: 0,
		process: ExchangeRateProcess.AdminSync,
		triggeredBy: adminName,
	});
	if (!ok) {
		throw new AppError(messages.EXCHANGE_RATE_SYNC_FAILED, 502);
	}
	return getExchangeRateByDate(date);
}
