import { Types } from 'mongoose';
import { logger, messages } from '../../config/index.js';
import {
	SavingCircleStatus,
	SavingsCircleTransactionSource,
} from '../../config/enums.js';
import { AppError } from '../../shared/errors/AppError.js';
import {
	assertAmountWithinAvailable,
	getMoneyPosition,
	toPublicMoneyPosition,
} from '../../shared/money/balance.js';
import { sumInPreferred } from '../../shared/utils/aggregateFx.js';
import { convertAmount } from '../../shared/utils/fx.js';
import { round2 } from '../../shared/utils/money.js';
import { CurrencyModel } from '../currency/currency.model.js';
import { SavingModel } from '../saving/saving.model.js';
import { SavingTransactionModel } from '../saving/saving-transaction.model.js';
import { UserModel } from '../user/user.model.js';
import { toPublicSavingsCircle, toPublicSavingsCircleTransaction } from './savings-circle.mapper.js';
import { SavingsCircleModel, type SavingsCircleDocument } from './savings-circle.model.js';
import { SavingsCircleTransactionModel } from './savings-circle-transaction.model.js';
import type {
	CreateSavingsCircleBody,
	ListSavingsCircleTransactionsQuery,
	ListSavingsCirclesQuery,
	SavingsCircleMovementBody,
	UpdateSavingsCircleBody,
	UpdateSavingsCircleTransactionBody,
} from './savings-circle.validation.js';

function isCreditSource(source: string): boolean {
	return (
		source === SavingsCircleTransactionSource.Contribution ||
		source === SavingsCircleTransactionSource.Payout
	);
}

async function getUserCurrency(userId: string): Promise<string> {
	const user = await UserModel.findById(userId).select('currency');
	if (!user) {
		throw new AppError(messages.USER_NOT_FOUND, 404);
	}
	return user.currency;
}

async function assertEnabledCurrency(code: string): Promise<void> {
	const found = await CurrencyModel.findOne({ code, enabled: true }).lean();
	if (!found) {
		throw new AppError(messages.CURRENCY_INVALID, 422);
	}
}

async function findOwnedCircle(userId: string, circleId: string): Promise<SavingsCircleDocument> {
	const circle = await SavingsCircleModel.findOne({ _id: circleId, userId });
	if (!circle) {
		throw new AppError(messages.SAVINGS_CIRCLE_NOT_FOUND, 404);
	}
	return circle;
}

function assertCircleActive(circle: SavingsCircleDocument): void {
	if (circle.status === SavingCircleStatus.Completed) {
		throw new AppError(messages.SAVINGS_CIRCLE_COMPLETED, 422);
	}
}

async function pendingPayoutFor(
	circle: SavingsCircleDocument,
	userCurrency: string,
): Promise<{ pending: number; pendingPreferred: number }> {
	const rows = await SavingsCircleTransactionModel.find({
		circleId: circle._id,
		source: {
			$in: [SavingsCircleTransactionSource.Payout, SavingsCircleTransactionSource.PayoutToSpendable],
		},
	})
		.select('amount currency date')
		.lean();
	let pending = 0;
	for (const row of rows) {
		pending += await convertAmount(row.amount, row.currency, circle.currency, row.date);
	}
	pending = round2(Math.max(0, pending));
	const pendingPreferred = await sumInPreferred(rows, userCurrency);
	return { pending, pendingPreferred: round2(Math.max(0, pendingPreferred)) };
}

async function assertPendingLeavesNonNegative(
	circle: SavingsCircleDocument,
	transactionId: string,
	next: { amount: number; currency: string; date: Date } | null,
): Promise<void> {
	const siblings = await SavingsCircleTransactionModel.find({
		circleId: circle._id,
		source: {
			$in: [SavingsCircleTransactionSource.Payout, SavingsCircleTransactionSource.PayoutToSpendable],
		},
	}).lean();
	let pending = 0;
	for (const row of siblings) {
		if (row._id.toString() === transactionId) {
			if (next === null) continue;
			pending += await convertAmount(next.amount, next.currency, circle.currency, next.date);
		} else {
			pending += await convertAmount(row.amount, row.currency, circle.currency, row.date);
		}
	}
	if (round2(pending) < 0) {
		throw new AppError(messages.SAVINGS_CIRCLE_PAYOUT_EXCEEDS_PENDING, 422);
	}
}

function nextSignedAmount(source: string, existingAmount: number, inputAmount: number | undefined): number {
	if (inputAmount === undefined) return existingAmount;
	return isCreditSource(source) ? inputAmount : -inputAmount;
}

async function toCircleResponse(circle: SavingsCircleDocument, userCurrency: string) {
	const { pending, pendingPreferred } = await pendingPayoutFor(circle, userCurrency);
	return toPublicSavingsCircle(circle, pending, pendingPreferred);
}

export async function migrateLegacySavingsCircles(): Promise<void> {
	const leftover = await SavingModel.collection.find({ kind: 'savings_circle' }).toArray();
	if (leftover.length === 0) return;

	let moved = 0;
	for (const row of leftover) {
		const circleId = row._id as Types.ObjectId;
		const existing = await SavingsCircleModel.findById(circleId);
		if (!existing) {
			await SavingsCircleModel.create({
				_id: circleId,
				userId: row.userId,
				name: row.name,
				currency: row.currency,
				notes: row.notes ?? null,
				status: row.status === SavingCircleStatus.Completed
					? SavingCircleStatus.Completed
					: SavingCircleStatus.Active,
				contributionAmount: row.contributionAmount ?? 0,
				frequency: row.frequency,
				memberCount: row.memberCount ?? 2,
				startDate: row.startDate ?? new Date(),
				expectedPayout: row.expectedPayout ?? 0,
				createdAt: row.createdAt,
				updatedAt: row.updatedAt,
			});
		}

		const txs = await SavingTransactionModel.collection.find({ savingId: circleId }).toArray();
		for (const tx of txs) {
			const source = tx.source as string;
			if (
				source !== SavingsCircleTransactionSource.Contribution &&
				source !== SavingsCircleTransactionSource.Payout &&
				source !== SavingsCircleTransactionSource.PayoutToSpendable
			) {
				continue;
			}
			const already = await SavingsCircleTransactionModel.findById(tx._id);
			if (already) continue;
			await SavingsCircleTransactionModel.create({
				_id: tx._id,
				circleId,
				userId: tx.userId,
				amount: tx.amount,
				currency: tx.currency,
				date: tx.date,
				note: tx.note ?? null,
				source,
				createdAt: tx.createdAt,
				updatedAt: tx.updatedAt,
			});
		}

		await SavingTransactionModel.deleteMany({ savingId: circleId });
		await SavingModel.deleteOne({ _id: circleId });
		moved += 1;
	}

	logger.info('Migrated legacy savings circles', { count: moved });
}

export async function createSavingsCircle(userId: string, input: CreateSavingsCircleBody) {
	const userCurrency = await getUserCurrency(userId);
	const currency = input.currency ?? userCurrency;
	await assertEnabledCurrency(currency);

	const expectedPayout = input.expectedPayout ?? round2(input.contributionAmount * input.memberCount);
	const circle = await SavingsCircleModel.create({
		userId,
		name: input.name,
		currency,
		notes: input.notes ?? null,
		status: SavingCircleStatus.Active,
		contributionAmount: input.contributionAmount,
		frequency: input.frequency,
		memberCount: input.memberCount,
		startDate: input.startDate,
		expectedPayout,
	});
	return toCircleResponse(circle, userCurrency);
}

export async function listSavingsCircles(userId: string, query: ListSavingsCirclesQuery) {
	const userCurrency = await getUserCurrency(userId);
	const filter: Record<string, unknown> = { userId };
	if (query.status) filter.status = query.status;

	const [circles, position] = await Promise.all([
		SavingsCircleModel.find(filter).sort({ createdAt: -1 }),
		getMoneyPosition(userId),
	]);

	const publicCircles = await Promise.all(
		circles.map((circle) => toCircleResponse(circle, userCurrency)),
	);

	return {
		circles: publicCircles,
		money: toPublicMoneyPosition(position),
	};
}

export async function getSavingsCircle(userId: string, circleId: string) {
	const userCurrency = await getUserCurrency(userId);
	const circle = await findOwnedCircle(userId, circleId);
	return toCircleResponse(circle, userCurrency);
}

export async function updateSavingsCircle(userId: string, circleId: string, input: UpdateSavingsCircleBody) {
	const circle = await findOwnedCircle(userId, circleId);
	assertCircleActive(circle);
	if (input.name !== undefined) circle.name = input.name;
	if (input.notes !== undefined) circle.notes = input.notes ?? null;
	if (input.contributionAmount !== undefined) circle.contributionAmount = input.contributionAmount;
	if (input.frequency !== undefined) circle.frequency = input.frequency;
	if (input.memberCount !== undefined) circle.memberCount = input.memberCount;
	if (input.startDate !== undefined) circle.startDate = input.startDate;
	if (input.expectedPayout !== undefined) circle.expectedPayout = input.expectedPayout;
	await circle.save();
	const userCurrency = await getUserCurrency(userId);
	return toCircleResponse(circle, userCurrency);
}

export async function deleteSavingsCircle(userId: string, circleId: string) {
	const circle = await findOwnedCircle(userId, circleId);
	const userCurrency = await getUserCurrency(userId);
	const { pending } = await pendingPayoutFor(circle, userCurrency);
	if (pending > 0) {
		await SavingsCircleTransactionModel.create({
			circleId: circle._id,
			userId,
			amount: -pending,
			currency: circle.currency,
			date: new Date(),
			note: null,
			source: SavingsCircleTransactionSource.PayoutToSpendable,
		});
	}

	await SavingsCircleTransactionModel.deleteMany({
		circleId: circle._id,
		userId,
		source: {
			$nin: [
				SavingsCircleTransactionSource.Contribution,
				SavingsCircleTransactionSource.PayoutToSpendable,
			],
		},
	});
	await SavingsCircleModel.deleteOne({ _id: circle._id, userId });
}

export async function addContribution(userId: string, circleId: string, input: SavingsCircleMovementBody) {
	const circle = await findOwnedCircle(userId, circleId);
	assertCircleActive(circle);
	const userCurrency = await getUserCurrency(userId);
	const currency = input.currency ?? userCurrency;
	await assertEnabledCurrency(currency);

	const date = input.date ?? new Date();
	await assertAmountWithinAvailable(userId, input.amount, currency, date);

	const transaction = await SavingsCircleTransactionModel.create({
		circleId: circle._id,
		userId,
		amount: input.amount,
		currency,
		date,
		note: input.note ?? null,
		source: SavingsCircleTransactionSource.Contribution,
	});

	const [publicTransaction, publicCircle] = await Promise.all([
		toPublicSavingsCircleTransaction(transaction, userCurrency),
		toCircleResponse(circle, userCurrency),
	]);
	return { transaction: publicTransaction, circle: publicCircle };
}

export async function recordPayout(userId: string, circleId: string, input: SavingsCircleMovementBody) {
	const circle = await findOwnedCircle(userId, circleId);
	assertCircleActive(circle);
	const userCurrency = await getUserCurrency(userId);
	const currency = input.currency ?? userCurrency;
	await assertEnabledCurrency(currency);

	const date = input.date ?? new Date();
	const transaction = await SavingsCircleTransactionModel.create({
		circleId: circle._id,
		userId,
		amount: input.amount,
		currency,
		date,
		note: input.note ?? null,
		source: SavingsCircleTransactionSource.Payout,
	});

	const [publicTransaction, publicCircle] = await Promise.all([
		toPublicSavingsCircleTransaction(transaction, userCurrency),
		toCircleResponse(circle, userCurrency),
	]);
	return { transaction: publicTransaction, circle: publicCircle };
}

export async function movePayoutToSpendable(
	userId: string,
	circleId: string,
	input: SavingsCircleMovementBody,
) {
	const circle = await findOwnedCircle(userId, circleId);
	const userCurrency = await getUserCurrency(userId);
	const currency = input.currency ?? userCurrency;
	await assertEnabledCurrency(currency);

	const date = input.date ?? new Date();
	const needed = round2(await convertAmount(input.amount, currency, circle.currency, date));
	const { pending } = await pendingPayoutFor(circle, userCurrency);
	if (needed > pending) {
		throw new AppError(messages.SAVINGS_CIRCLE_PAYOUT_EXCEEDS_PENDING, 422);
	}

	const transaction = await SavingsCircleTransactionModel.create({
		circleId: circle._id,
		userId,
		amount: -input.amount,
		currency,
		date,
		note: input.note ?? null,
		source: SavingsCircleTransactionSource.PayoutToSpendable,
	});

	const [publicTransaction, publicCircle] = await Promise.all([
		toPublicSavingsCircleTransaction(transaction, userCurrency),
		toCircleResponse(circle, userCurrency),
	]);
	return { transaction: publicTransaction, circle: publicCircle };
}

export async function completeCircle(userId: string, circleId: string) {
	const circle = await findOwnedCircle(userId, circleId);
	assertCircleActive(circle);
	circle.status = SavingCircleStatus.Completed;
	await circle.save();
	const userCurrency = await getUserCurrency(userId);
	return toCircleResponse(circle, userCurrency);
}

export async function listTransactions(
	userId: string,
	circleId: string,
	query: ListSavingsCircleTransactionsQuery,
) {
	const circle = await findOwnedCircle(userId, circleId);
	const userCurrency = await getUserCurrency(userId);
	const page = query.page;
	const limit = query.limit;
	const skip = (page - 1) * limit;

	const [rows, total] = await Promise.all([
		SavingsCircleTransactionModel.find({ circleId: circle._id, userId })
			.sort({ date: -1, createdAt: -1 })
			.skip(skip)
			.limit(limit),
		SavingsCircleTransactionModel.countDocuments({ circleId: circle._id, userId }),
	]);

	return {
		items: await Promise.all(rows.map((row) => toPublicSavingsCircleTransaction(row, userCurrency))),
		page,
		limit,
		total,
		totalPages: Math.ceil(total / limit) || 0,
	};
}

async function findOwnedTransaction(userId: string, circleId: string, transactionId: string) {
	const circle = await findOwnedCircle(userId, circleId);
	const existing = await SavingsCircleTransactionModel.findOne({
		_id: transactionId,
		circleId: circle._id,
		userId,
	});
	if (!existing) {
		throw new AppError(messages.SAVINGS_CIRCLE_TRANSACTION_NOT_FOUND, 404);
	}
	return { circle, existing };
}

export async function updateTransaction(
	userId: string,
	circleId: string,
	transactionId: string,
	input: UpdateSavingsCircleTransactionBody,
) {
	const { circle, existing } = await findOwnedTransaction(userId, circleId, transactionId);
	const userCurrency = await getUserCurrency(userId);
	const nextAmount = nextSignedAmount(existing.source, existing.amount, input.amount);
	const nextCurrency = input.currency ?? existing.currency;
	const nextDate = input.date ?? existing.date;

	if (input.currency !== undefined) {
		await assertEnabledCurrency(nextCurrency);
	}

	if (existing.source === SavingsCircleTransactionSource.Contribution) {
		const [oldPreferred, newPreferred, position] = await Promise.all([
			convertAmount(existing.amount, existing.currency, userCurrency, existing.date),
			convertAmount(nextAmount, nextCurrency, userCurrency, nextDate),
			getMoneyPosition(userId),
		]);
		const extra = round2(newPreferred - oldPreferred);
		if (extra > position.available) {
			throw new AppError(messages.SAVINGS_AMOUNT_EXCEEDS_AVAILABLE, 422);
		}
	}

	if (existing.source === SavingsCircleTransactionSource.PayoutToSpendable) {
		const [oldPreferred, newPreferred, position] = await Promise.all([
			convertAmount(existing.amount, existing.currency, userCurrency, existing.date),
			convertAmount(nextAmount, nextCurrency, userCurrency, nextDate),
			getMoneyPosition(userId),
		]);
		const extra = round2(oldPreferred - newPreferred);
		if (extra > position.available) {
			throw new AppError(messages.SAVINGS_AMOUNT_EXCEEDS_AVAILABLE, 422);
		}
	}

	if (
		existing.source === SavingsCircleTransactionSource.Payout ||
		existing.source === SavingsCircleTransactionSource.PayoutToSpendable
	) {
		await assertPendingLeavesNonNegative(circle, existing._id.toString(), {
			amount: nextAmount,
			currency: nextCurrency,
			date: nextDate,
		});
	}

	if (input.note !== undefined) existing.note = input.note ?? null;
	existing.amount = nextAmount;
	existing.currency = nextCurrency;
	existing.date = nextDate;
	await existing.save();

	const [transaction, publicCircle] = await Promise.all([
		toPublicSavingsCircleTransaction(existing, userCurrency),
		toCircleResponse(circle, userCurrency),
	]);
	return { transaction, circle: publicCircle };
}

export async function deleteTransaction(userId: string, circleId: string, transactionId: string) {
	const { circle, existing } = await findOwnedTransaction(userId, circleId, transactionId);
	const userCurrency = await getUserCurrency(userId);

	if (existing.source === SavingsCircleTransactionSource.PayoutToSpendable) {
		const [oldPreferred, position] = await Promise.all([
			convertAmount(existing.amount, existing.currency, userCurrency, existing.date),
			getMoneyPosition(userId),
		]);
		const extra = round2(0 - oldPreferred);
		if (extra > position.available) {
			throw new AppError(messages.SAVINGS_AMOUNT_EXCEEDS_AVAILABLE, 422);
		}
	}

	if (
		existing.source === SavingsCircleTransactionSource.Payout ||
		existing.source === SavingsCircleTransactionSource.PayoutToSpendable
	) {
		await assertPendingLeavesNonNegative(circle, existing._id.toString(), null);
	}

	await SavingsCircleTransactionModel.deleteOne({ _id: existing._id, userId });
	return toCircleResponse(circle, userCurrency);
}
