import { ExchangeRateSource, ExchangeRateStatus, FxSyncLogType } from '../../config/enums.js';
import { limits } from '../../config/limits.js';
import { messages } from '../../config/messages.js';
import { AppError } from '../../shared/errors/AppError.js';
import { toPublicExchangeRate, toPublicFxSyncLog } from './exchange-rate.mapper.js';
import { ExchangeRateModel } from './exchange-rate.model.js';
import {
	clearExchangeRateMemoryCache,
	syncExchangeRatesForDate,
	toRateDateKey,
} from './exchange-rate.service.js';
import type {
	CreateExchangeRateBody,
	ListExchangeRatesQuery,
	ListFxSyncLogsQuery,
	UpdateExchangeRateBody,
} from './exchange-rate.validation.js';
import { FxSyncLogModel } from './fx-sync-log.model.js';

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
	};
}

export async function getExchangeRateByDate(date: string) {
	const doc = await ExchangeRateModel.findOne({ date });
	if (!doc) {
		throw new AppError(messages.EXCHANGE_RATE_NOT_FOUND, 404);
	}
	return toPublicExchangeRate(doc);
}

export async function createExchangeRate(adminUserId: string, input: CreateExchangeRateBody) {
	const existing = await ExchangeRateModel.findOne({ date: input.date }).lean();
	if (existing) {
		throw new AppError(messages.VALIDATION_FAILED, 409, [
			{ field: 'date', message: 'Exchange rate for this date already exists' },
		]);
	}

	const rates = { ...input.rates, [limits.systemBaseCurrency]: 1 };
	const now = new Date();
	const doc = await ExchangeRateModel.create({
		date: input.date,
		base: input.base || limits.systemBaseCurrency,
		rates,
		fetchedAt: now,
		source: ExchangeRateSource.Manual,
		status: ExchangeRateStatus.Manual,
		attemptCount: 1,
		lastError: null,
		notes: input.notes ?? null,
		updatedBy: adminUserId,
	});
	clearExchangeRateMemoryCache(input.date);
	return toPublicExchangeRate(doc);
}

export async function updateExchangeRate(adminUserId: string, date: string, input: UpdateExchangeRateBody) {
	const doc = await ExchangeRateModel.findOne({ date });
	if (!doc) {
		throw new AppError(messages.EXCHANGE_RATE_NOT_FOUND, 404);
	}

	if (input.rates) {
		doc.set('rates', { ...input.rates, [limits.systemBaseCurrency]: 1 });
		doc.source = ExchangeRateSource.Manual;
		doc.status = ExchangeRateStatus.Manual;
		doc.fetchedAt = new Date();
		doc.lastError = null;
	}
	if (input.notes !== undefined) {
		doc.notes = input.notes ?? null;
	}
	if (input.status !== undefined) {
		doc.status = input.status;
	}
	doc.updatedBy = adminUserId;
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

export async function retryExchangeRate(adminUserId: string, date: string) {
	const ok = await syncExchangeRatesForDate(date, {
		maxAttempts: 1,
		retryDelayMs: 0,
		triggeredBy: adminUserId,
		logType: FxSyncLogType.RetryDate,
		source: ExchangeRateSource.AdminRetry,
	});
	if (!ok) {
		throw new AppError(messages.EXCHANGE_RATE_SYNC_FAILED, 502);
	}
	return getExchangeRateByDate(date);
}

export async function syncTodayExchangeRate(adminUserId: string) {
	const date = toRateDateKey();
	const ok = await syncExchangeRatesForDate(date, {
		maxAttempts: 1,
		retryDelayMs: 0,
		triggeredBy: adminUserId,
		logType: FxSyncLogType.RetryDate,
		source: ExchangeRateSource.AdminRetry,
	});
	if (!ok) {
		throw new AppError(messages.EXCHANGE_RATE_SYNC_FAILED, 502);
	}
	return getExchangeRateByDate(date);
}

export async function listFxSyncLogs(query: ListFxSyncLogsQuery) {
	const filter: Record<string, unknown> = {};
	if (query.success !== undefined) {
		filter.success = query.success;
	}
	const skip = (query.page - 1) * query.limit;
	const [rows, total] = await Promise.all([
		FxSyncLogModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit),
		FxSyncLogModel.countDocuments(filter),
	]);
	return {
		items: rows.map((row) => toPublicFxSyncLog(row)),
		page: query.page,
		limit: query.limit,
		total,
	};
}
