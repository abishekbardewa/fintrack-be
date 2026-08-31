import { messages } from '../../config/messages.js';
import { SavingTransactionSource } from '../../config/enums.js';
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
import { UserModel } from '../user/user.model.js';
import { toPublicSaving, toPublicSavingTransaction } from './saving.mapper.js';
import { SavingModel, type SavingDocument } from './saving.model.js';
import { SavingTransactionModel } from './saving-transaction.model.js';
import type {
	CreateSavingBody,
	ListSavingTransactionsQuery,
	SavingMovementBody,
	StartingBalanceBody,
	UpdateSavingBody,
	UpdateSavingTransactionBody,
} from './saving.validation.js';

function isCreditSource(source: string): boolean {
	return (
		source === SavingTransactionSource.StartingBalance ||
		source === SavingTransactionSource.Contribution ||
		source === SavingTransactionSource.Return
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

async function findOwnedSaving(userId: string, savingId: string): Promise<SavingDocument> {
	const saving = await SavingModel.findOne({
		_id: savingId,
		userId,
		kind: { $ne: 'savings_circle' },
	});
	if (!saving) {
		throw new AppError(messages.SAVING_NOT_FOUND, 404);
	}
	return saving;
}

async function recomputeSavingBalance(saving: SavingDocument): Promise<void> {
	const rows = await SavingTransactionModel.find({ savingId: saving._id }).lean();
	let total = 0;
	for (const row of rows) {
		total += await convertAmount(row.amount, row.currency, saving.currency, row.date);
	}
	saving.currentAmount = round2(Math.max(0, total));
	await saving.save();
}

async function assertAmountWithinSaving(
	saving: SavingDocument,
	amount: number,
	currency: string,
	date: Date,
): Promise<void> {
	const needed = round2(await convertAmount(amount, currency, saving.currency, date));
	if (needed > saving.currentAmount) {
		throw new AppError(messages.SAVING_AMOUNT_EXCEEDS_BALANCE, 422);
	}
}

async function assertLedgerLeavesNonNegative(
	saving: SavingDocument,
	transactionId: string,
	next: { amount: number; currency: string; date: Date } | null,
): Promise<void> {
	const siblings = await SavingTransactionModel.find({ savingId: saving._id }).lean();
	let remainingTotal = 0;
	for (const row of siblings) {
		if (row._id.toString() === transactionId) {
			if (next === null) continue;
			remainingTotal += await convertAmount(next.amount, next.currency, saving.currency, next.date);
		} else {
			remainingTotal += await convertAmount(row.amount, row.currency, saving.currency, row.date);
		}
	}
	if (round2(remainingTotal) < 0) {
		throw new AppError(messages.SAVING_AMOUNT_EXCEEDS_BALANCE, 422);
	}
}

function nextSignedAmount(source: string, existingAmount: number, inputAmount: number | undefined): number {
	if (inputAmount === undefined) return existingAmount;
	return isCreditSource(source) ? inputAmount : -inputAmount;
}

async function toSavingResponse(saving: SavingDocument, userCurrency: string) {
	const rows = await SavingTransactionModel.find({ savingId: saving._id })
		.select('amount currency date')
		.lean();
	const currentAmountPreferred = await sumInPreferred(rows, userCurrency);
	return toPublicSaving(saving, userCurrency, currentAmountPreferred);
}

export async function createSaving(userId: string, input: CreateSavingBody) {
	const userCurrency = await getUserCurrency(userId);
	const currency = input.currency ?? userCurrency;
	await assertEnabledCurrency(currency);

	const startingAmount = input.startingAmount ?? 0;
	const saving = await SavingModel.create({
		userId,
		name: input.name,
		currency,
		currentAmount: 0,
		notes: input.notes ?? null,
	});

	if (startingAmount > 0) {
		await SavingTransactionModel.create({
			savingId: saving._id,
			userId,
			amount: startingAmount,
			currency,
			date: new Date(),
			note: null,
			source: SavingTransactionSource.StartingBalance,
		});
		await recomputeSavingBalance(saving);
	}

	return toSavingResponse(saving, userCurrency);
}

export async function listSavings(userId: string) {
	const userCurrency = await getUserCurrency(userId);
	const [savings, position] = await Promise.all([
		SavingModel.find({ userId, kind: { $ne: 'savings_circle' } }).sort({ createdAt: -1 }),
		getMoneyPosition(userId),
	]);

	const publicSavings = await Promise.all(
		savings.map((saving) => toSavingResponse(saving, userCurrency)),
	);

	return {
		savings: publicSavings,
		money: toPublicMoneyPosition(position),
	};
}

export async function getSaving(userId: string, savingId: string) {
	const userCurrency = await getUserCurrency(userId);
	const saving = await findOwnedSaving(userId, savingId);
	return toSavingResponse(saving, userCurrency);
}

export async function updateSaving(userId: string, savingId: string, input: UpdateSavingBody) {
	const saving = await findOwnedSaving(userId, savingId);
	if (input.name !== undefined) saving.name = input.name;
	if (input.notes !== undefined) saving.notes = input.notes ?? null;
	await saving.save();
	const userCurrency = await getUserCurrency(userId);
	return toSavingResponse(saving, userCurrency);
}

export async function deleteSaving(userId: string, savingId: string) {
	const saving = await findOwnedSaving(userId, savingId);
	const rows = await SavingTransactionModel.find({
		savingId: saving._id,
		userId,
	}).lean();

	let nonSpendableNet = 0;
	for (const row of rows) {
		if (
			row.source === SavingTransactionSource.StartingBalance ||
			row.source === SavingTransactionSource.Return
		) {
			nonSpendableNet += await convertAmount(row.amount, row.currency, saving.currency, row.date);
		}
	}
	const extra = round2(nonSpendableNet);

	let keepId: string | null = null;
	if (extra > 0) {
		const kept = await SavingTransactionModel.create({
			savingId: saving._id,
			userId,
			amount: -extra,
			currency: saving.currency,
			date: new Date(),
			note: null,
			source: SavingTransactionSource.Withdrawal,
		});
		keepId = kept._id.toString();
	} else if (extra < 0) {
		const kept = await SavingTransactionModel.create({
			savingId: saving._id,
			userId,
			amount: -extra,
			currency: saving.currency,
			date: new Date(),
			note: null,
			source: SavingTransactionSource.Contribution,
		});
		keepId = kept._id.toString();
	}

	if (keepId) {
		await SavingTransactionModel.deleteMany({
			savingId: saving._id,
			userId,
			_id: { $ne: keepId },
		});
	} else {
		await SavingTransactionModel.deleteMany({ savingId: saving._id, userId });
	}

	await SavingModel.deleteOne({ _id: saving._id, userId });
}

export async function addStartingBalance(userId: string, savingId: string, input: StartingBalanceBody) {
	const saving = await findOwnedSaving(userId, savingId);
	const userCurrency = await getUserCurrency(userId);
	const currency = input.currency ?? userCurrency;
	await assertEnabledCurrency(currency);

	const transaction = await SavingTransactionModel.create({
		savingId: saving._id,
		userId,
		amount: input.amount,
		currency,
		date: input.date ?? new Date(),
		note: null,
		source: SavingTransactionSource.StartingBalance,
	});
	await recomputeSavingBalance(saving);

	const [publicTransaction, publicSaving] = await Promise.all([
		toPublicSavingTransaction(transaction, userCurrency),
		toSavingResponse(saving, userCurrency),
	]);
	return { transaction: publicTransaction, saving: publicSaving };
}

export async function addContribution(userId: string, savingId: string, input: SavingMovementBody) {
	const saving = await findOwnedSaving(userId, savingId);
	const userCurrency = await getUserCurrency(userId);
	const currency = input.currency ?? userCurrency;
	await assertEnabledCurrency(currency);

	const date = input.date ?? new Date();
	await assertAmountWithinAvailable(userId, input.amount, currency, date);

	const transaction = await SavingTransactionModel.create({
		savingId: saving._id,
		userId,
		amount: input.amount,
		currency,
		date,
		note: input.note ?? null,
		source: SavingTransactionSource.Contribution,
	});
	await recomputeSavingBalance(saving);

	const [publicTransaction, publicSaving] = await Promise.all([
		toPublicSavingTransaction(transaction, userCurrency),
		toSavingResponse(saving, userCurrency),
	]);
	return { transaction: publicTransaction, saving: publicSaving };
}

export async function withdrawFromSaving(userId: string, savingId: string, input: SavingMovementBody) {
	const saving = await findOwnedSaving(userId, savingId);
	const userCurrency = await getUserCurrency(userId);
	const currency = input.currency ?? userCurrency;
	await assertEnabledCurrency(currency);

	const date = input.date ?? new Date();
	await assertAmountWithinSaving(saving, input.amount, currency, date);

	const transaction = await SavingTransactionModel.create({
		savingId: saving._id,
		userId,
		amount: -input.amount,
		currency,
		date,
		note: input.note ?? null,
		source: SavingTransactionSource.Withdrawal,
	});
	await recomputeSavingBalance(saving);

	const [publicTransaction, publicSaving] = await Promise.all([
		toPublicSavingTransaction(transaction, userCurrency),
		toSavingResponse(saving, userCurrency),
	]);
	return { transaction: publicTransaction, saving: publicSaving };
}

export async function addReturn(userId: string, savingId: string, input: SavingMovementBody) {
	const saving = await findOwnedSaving(userId, savingId);
	const userCurrency = await getUserCurrency(userId);
	const currency = input.currency ?? userCurrency;
	await assertEnabledCurrency(currency);

	const date = input.date ?? new Date();
	const transaction = await SavingTransactionModel.create({
		savingId: saving._id,
		userId,
		amount: input.amount,
		currency,
		date,
		note: input.note ?? null,
		source: SavingTransactionSource.Return,
	});
	await recomputeSavingBalance(saving);

	const [publicTransaction, publicSaving] = await Promise.all([
		toPublicSavingTransaction(transaction, userCurrency),
		toSavingResponse(saving, userCurrency),
	]);
	return { transaction: publicTransaction, saving: publicSaving };
}

export async function listTransactions(
	userId: string,
	savingId: string,
	query: ListSavingTransactionsQuery,
) {
	const saving = await findOwnedSaving(userId, savingId);
	const userCurrency = await getUserCurrency(userId);
	const page = query.page;
	const limit = query.limit;
	const skip = (page - 1) * limit;

	const [rows, total] = await Promise.all([
		SavingTransactionModel.find({ savingId: saving._id, userId })
			.sort({ date: -1, createdAt: -1 })
			.skip(skip)
			.limit(limit),
		SavingTransactionModel.countDocuments({ savingId: saving._id, userId }),
	]);

	return {
		items: await Promise.all(rows.map((row) => toPublicSavingTransaction(row, userCurrency))),
		page,
		limit,
		total,
		totalPages: Math.ceil(total / limit) || 0,
	};
}

async function findOwnedTransaction(userId: string, savingId: string, transactionId: string) {
	const saving = await findOwnedSaving(userId, savingId);
	const existing = await SavingTransactionModel.findOne({
		_id: transactionId,
		savingId: saving._id,
		userId,
	});
	if (!existing) {
		throw new AppError(messages.SAVING_TRANSACTION_NOT_FOUND, 404);
	}
	return { saving, existing };
}

export async function updateTransaction(
	userId: string,
	savingId: string,
	transactionId: string,
	input: UpdateSavingTransactionBody,
) {
	const { saving, existing } = await findOwnedTransaction(userId, savingId, transactionId);
	const userCurrency = await getUserCurrency(userId);
	const nextAmount = nextSignedAmount(existing.source, existing.amount, input.amount);
	const nextCurrency = input.currency ?? existing.currency;
	const nextDate = input.date ?? existing.date;

	if (input.currency !== undefined) {
		await assertEnabledCurrency(nextCurrency);
	}

	if (existing.source === SavingTransactionSource.Contribution) {
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

	if (existing.source === SavingTransactionSource.Withdrawal) {
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

	await assertLedgerLeavesNonNegative(saving, existing._id.toString(), {
		amount: nextAmount,
		currency: nextCurrency,
		date: nextDate,
	});

	if (input.note !== undefined) existing.note = input.note ?? null;
	existing.amount = nextAmount;
	existing.currency = nextCurrency;
	existing.date = nextDate;
	await existing.save();
	await recomputeSavingBalance(saving);

	const [transaction, publicSaving] = await Promise.all([
		toPublicSavingTransaction(existing, userCurrency),
		toSavingResponse(saving, userCurrency),
	]);
	return { transaction, saving: publicSaving };
}

export async function deleteTransaction(userId: string, savingId: string, transactionId: string) {
	const { saving, existing } = await findOwnedTransaction(userId, savingId, transactionId);
	const userCurrency = await getUserCurrency(userId);

	if (existing.source === SavingTransactionSource.Withdrawal) {
		const [oldPreferred, position] = await Promise.all([
			convertAmount(existing.amount, existing.currency, userCurrency, existing.date),
			getMoneyPosition(userId),
		]);
		const extra = round2(0 - oldPreferred);
		if (extra > position.available) {
			throw new AppError(messages.SAVINGS_AMOUNT_EXCEEDS_AVAILABLE, 422);
		}
	}

	await assertLedgerLeavesNonNegative(saving, existing._id.toString(), null);
	await SavingTransactionModel.deleteOne({ _id: existing._id, userId });
	await recomputeSavingBalance(saving);
	return toSavingResponse(saving, userCurrency);
}
