import { messages } from '../../config/messages.js';
import { InvestmentStatus, InvestmentTransactionSource } from '../../config/enums.js';
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
import { toPublicInvestment, toPublicInvestmentTransaction } from './investment.mapper.js';
import { InvestmentModel, type InvestmentDocument } from './investment.model.js';
import { InvestmentTransactionModel } from './investment-transaction.model.js';
import type {
	CloseInvestmentBody,
	CreateInvestmentBody,
	InvestmentMovementBody,
	ListInvestmentTransactionsQuery,
	ListInvestmentsQuery,
	StartingBalanceBody,
	UpdateInvestmentBody,
	UpdateInvestmentTransactionBody,
} from './investment.validation.js';

function isCreditSource(source: string): boolean {
	return (
		source === InvestmentTransactionSource.StartingBalance ||
		source === InvestmentTransactionSource.Contribution ||
		source === InvestmentTransactionSource.Return
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

async function findOwnedInvestment(userId: string, investmentId: string): Promise<InvestmentDocument> {
	const investment = await InvestmentModel.findOne({ _id: investmentId, userId });
	if (!investment) {
		throw new AppError(messages.INVESTMENT_NOT_FOUND, 404);
	}
	return investment;
}

function assertActive(investment: InvestmentDocument): void {
	if (investment.status === InvestmentStatus.Closed) {
		throw new AppError(messages.INVESTMENT_CLOSED, 422);
	}
}

async function recomputeInvestmentBalance(investment: InvestmentDocument): Promise<void> {
	const rows = await InvestmentTransactionModel.find({ investmentId: investment._id }).lean();
	let total = 0;
	for (const row of rows) {
		total += await convertAmount(row.amount, row.currency, investment.currency, row.date);
	}
	investment.currentBalance = round2(Math.max(0, total));
	await investment.save();
}

async function assertAmountWithinInvestment(
	investment: InvestmentDocument,
	amount: number,
	currency: string,
	date: Date,
): Promise<void> {
	const needed = round2(await convertAmount(amount, currency, investment.currency, date));
	if (needed > investment.currentBalance) {
		throw new AppError(messages.INVESTMENT_AMOUNT_EXCEEDS_BALANCE, 422);
	}
}

async function assertLedgerLeavesNonNegative(
	investment: InvestmentDocument,
	transactionId: string,
	next: { amount: number; currency: string; date: Date } | null,
): Promise<void> {
	const siblings = await InvestmentTransactionModel.find({ investmentId: investment._id }).lean();
	let remainingTotal = 0;
	for (const row of siblings) {
		if (row._id.toString() === transactionId) {
			if (next === null) continue;
			remainingTotal += await convertAmount(next.amount, next.currency, investment.currency, next.date);
		} else {
			remainingTotal += await convertAmount(row.amount, row.currency, investment.currency, row.date);
		}
	}
	if (round2(remainingTotal) < 0) {
		throw new AppError(messages.INVESTMENT_AMOUNT_EXCEEDS_BALANCE, 422);
	}
}

function nextSignedAmount(source: string, existingAmount: number, inputAmount: number | undefined): number {
	if (inputAmount === undefined) return existingAmount;
	return isCreditSource(source) ? inputAmount : -inputAmount;
}

async function toInvestmentResponse(investment: InvestmentDocument, userCurrency: string) {
	const rows = await InvestmentTransactionModel.find({ investmentId: investment._id })
		.select('amount currency date')
		.lean();
	const currentBalancePreferred = await sumInPreferred(rows, userCurrency);
	return toPublicInvestment(investment, userCurrency, currentBalancePreferred);
}

export async function createInvestment(userId: string, input: CreateInvestmentBody) {
	const userCurrency = await getUserCurrency(userId);
	const currency = input.currency ?? userCurrency;
	await assertEnabledCurrency(currency);

	const startingAmount = input.startingAmount ?? 0;
	const investment = await InvestmentModel.create({
		userId,
		name: input.name,
		currency,
		initialAmount: startingAmount,
		currentBalance: 0,
		startDate: input.startDate ?? null,
		closedAmount: 0,
		notes: input.notes ?? null,
		status: InvestmentStatus.Active,
	});

	if (startingAmount > 0) {
		await InvestmentTransactionModel.create({
			investmentId: investment._id,
			userId,
			amount: startingAmount,
			currency,
			date: input.startDate ?? new Date(),
			note: null,
			source: InvestmentTransactionSource.StartingBalance,
		});
		await recomputeInvestmentBalance(investment);
	}

	return toInvestmentResponse(investment, userCurrency);
}

export async function listInvestments(userId: string, query: ListInvestmentsQuery) {
	const userCurrency = await getUserCurrency(userId);
	const filter: Record<string, unknown> = { userId };
	if (query.status) filter.status = query.status;

	const [investments, position] = await Promise.all([
		InvestmentModel.find(filter).sort({ createdAt: -1 }),
		getMoneyPosition(userId),
	]);

	const publicInvestments = await Promise.all(
		investments.map((investment) => toInvestmentResponse(investment, userCurrency)),
	);

	return {
		investments: publicInvestments,
		money: toPublicMoneyPosition(position),
	};
}

export async function getInvestment(userId: string, investmentId: string) {
	const userCurrency = await getUserCurrency(userId);
	const investment = await findOwnedInvestment(userId, investmentId);
	return toInvestmentResponse(investment, userCurrency);
}

export async function updateInvestment(userId: string, investmentId: string, input: UpdateInvestmentBody) {
	const investment = await findOwnedInvestment(userId, investmentId);
	assertActive(investment);
	if (input.name !== undefined) investment.name = input.name;
	if (input.notes !== undefined) investment.notes = input.notes ?? null;
	if (input.startDate !== undefined) investment.startDate = input.startDate ?? null;
	await investment.save();
	const userCurrency = await getUserCurrency(userId);
	return toInvestmentResponse(investment, userCurrency);
}

export async function deleteInvestment(userId: string, investmentId: string) {
	const investment = await findOwnedInvestment(userId, investmentId);
	const rows = await InvestmentTransactionModel.find({
		investmentId: investment._id,
		userId,
	}).lean();

	let nonSpendableNet = 0;
	for (const row of rows) {
		if (
			row.source === InvestmentTransactionSource.StartingBalance ||
			row.source === InvestmentTransactionSource.Return ||
			row.source === InvestmentTransactionSource.Loss
		) {
			nonSpendableNet += await convertAmount(
				row.amount,
				row.currency,
				investment.currency,
				row.date,
			);
		}
	}
	const extra = round2(nonSpendableNet);

	let keepId: string | null = null;
	if (extra > 0) {
		const kept = await InvestmentTransactionModel.create({
			investmentId: investment._id,
			userId,
			amount: -extra,
			currency: investment.currency,
			date: new Date(),
			note: null,
			source: InvestmentTransactionSource.Withdrawal,
		});
		keepId = kept._id.toString();
	} else if (extra < 0) {
		const kept = await InvestmentTransactionModel.create({
			investmentId: investment._id,
			userId,
			amount: -extra,
			currency: investment.currency,
			date: new Date(),
			note: null,
			source: InvestmentTransactionSource.Contribution,
		});
		keepId = kept._id.toString();
	}

	if (keepId) {
		await InvestmentTransactionModel.deleteMany({
			investmentId: investment._id,
			userId,
			_id: { $ne: keepId },
		});
	} else {
		await InvestmentTransactionModel.deleteMany({ investmentId: investment._id, userId });
	}

	await InvestmentModel.deleteOne({ _id: investment._id, userId });
}

export async function addStartingBalance(
	userId: string,
	investmentId: string,
	input: StartingBalanceBody,
) {
	const investment = await findOwnedInvestment(userId, investmentId);
	assertActive(investment);
	const userCurrency = await getUserCurrency(userId);
	const currency = input.currency ?? userCurrency;
	await assertEnabledCurrency(currency);

	const transaction = await InvestmentTransactionModel.create({
		investmentId: investment._id,
		userId,
		amount: input.amount,
		currency,
		date: input.date ?? new Date(),
		note: null,
		source: InvestmentTransactionSource.StartingBalance,
	});

	if (investment.initialAmount === 0) {
		investment.initialAmount = input.amount;
	}
	await recomputeInvestmentBalance(investment);

	const [publicTransaction, publicInvestment] = await Promise.all([
		toPublicInvestmentTransaction(transaction, userCurrency),
		toInvestmentResponse(investment, userCurrency),
	]);
	return { transaction: publicTransaction, investment: publicInvestment };
}

async function addMovement(
	userId: string,
	investmentId: string,
	input: InvestmentMovementBody,
	source: (typeof InvestmentTransactionSource)[keyof typeof InvestmentTransactionSource],
) {
	const investment = await findOwnedInvestment(userId, investmentId);
	assertActive(investment);
	const userCurrency = await getUserCurrency(userId);
	const currency = input.currency ?? userCurrency;
	await assertEnabledCurrency(currency);

	const date = input.date ?? new Date();
	const isDebit =
		source === InvestmentTransactionSource.Withdrawal || source === InvestmentTransactionSource.Loss;

	if (source === InvestmentTransactionSource.Contribution) {
		await assertAmountWithinAvailable(userId, input.amount, currency, date);
		if (investment.initialAmount === 0) {
			investment.initialAmount = input.amount;
		}
	}
	if (isDebit) {
		await assertAmountWithinInvestment(investment, input.amount, currency, date);
	}

	const transaction = await InvestmentTransactionModel.create({
		investmentId: investment._id,
		userId,
		amount: isDebit ? -input.amount : input.amount,
		currency,
		date,
		note: input.note ?? null,
		source,
	});
	await recomputeInvestmentBalance(investment);

	const [publicTransaction, publicInvestment] = await Promise.all([
		toPublicInvestmentTransaction(transaction, userCurrency),
		toInvestmentResponse(investment, userCurrency),
	]);
	return { transaction: publicTransaction, investment: publicInvestment };
}

export async function addContribution(userId: string, investmentId: string, input: InvestmentMovementBody) {
	return addMovement(userId, investmentId, input, InvestmentTransactionSource.Contribution);
}

export async function addReturn(userId: string, investmentId: string, input: InvestmentMovementBody) {
	return addMovement(userId, investmentId, input, InvestmentTransactionSource.Return);
}

export async function withdrawFromInvestment(
	userId: string,
	investmentId: string,
	input: InvestmentMovementBody,
) {
	return addMovement(userId, investmentId, input, InvestmentTransactionSource.Withdrawal);
}

export async function recordLoss(userId: string, investmentId: string, input: InvestmentMovementBody) {
	return addMovement(userId, investmentId, input, InvestmentTransactionSource.Loss);
}

export async function closeInvestment(userId: string, investmentId: string, input: CloseInvestmentBody) {
	const investment = await findOwnedInvestment(userId, investmentId);
	assertActive(investment);
	const userCurrency = await getUserCurrency(userId);
	const date = input.date ?? new Date();

	let transaction = null;
	if (investment.currentBalance > 0) {
		investment.closedAmount = investment.currentBalance;
		transaction = await InvestmentTransactionModel.create({
			investmentId: investment._id,
			userId,
			amount: -investment.currentBalance,
			currency: investment.currency,
			date,
			note: input.note ?? null,
			source: InvestmentTransactionSource.Withdrawal,
		});
		await recomputeInvestmentBalance(investment);
	} else {
		investment.closedAmount = 0;
	}

	investment.status = InvestmentStatus.Closed;
	await investment.save();

	const [publicTransaction, publicInvestment] = await Promise.all([
		transaction ? toPublicInvestmentTransaction(transaction, userCurrency) : Promise.resolve(null),
		toInvestmentResponse(investment, userCurrency),
	]);
	return { transaction: publicTransaction, investment: publicInvestment };
}

export async function listTransactions(
	userId: string,
	investmentId: string,
	query: ListInvestmentTransactionsQuery,
) {
	const investment = await findOwnedInvestment(userId, investmentId);
	const userCurrency = await getUserCurrency(userId);
	const page = query.page;
	const limit = query.limit;
	const skip = (page - 1) * limit;

	const [rows, total] = await Promise.all([
		InvestmentTransactionModel.find({ investmentId: investment._id, userId })
			.sort({ date: -1, createdAt: -1 })
			.skip(skip)
			.limit(limit),
		InvestmentTransactionModel.countDocuments({ investmentId: investment._id, userId }),
	]);

	return {
		items: await Promise.all(rows.map((row) => toPublicInvestmentTransaction(row, userCurrency))),
		page,
		limit,
		total,
		totalPages: Math.ceil(total / limit) || 0,
	};
}

async function findOwnedTransaction(userId: string, investmentId: string, transactionId: string) {
	const investment = await findOwnedInvestment(userId, investmentId);
	const existing = await InvestmentTransactionModel.findOne({
		_id: transactionId,
		investmentId: investment._id,
		userId,
	});
	if (!existing) {
		throw new AppError(messages.INVESTMENT_TRANSACTION_NOT_FOUND, 404);
	}
	return { investment, existing };
}

export async function updateTransaction(
	userId: string,
	investmentId: string,
	transactionId: string,
	input: UpdateInvestmentTransactionBody,
) {
	const { investment, existing } = await findOwnedTransaction(userId, investmentId, transactionId);
	assertActive(investment);
	const userCurrency = await getUserCurrency(userId);
	const nextAmount = nextSignedAmount(existing.source, existing.amount, input.amount);
	const nextCurrency = input.currency ?? existing.currency;
	const nextDate = input.date ?? existing.date;

	if (input.currency !== undefined) {
		await assertEnabledCurrency(nextCurrency);
	}

	if (existing.source === InvestmentTransactionSource.Contribution) {
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

	if (existing.source === InvestmentTransactionSource.Withdrawal) {
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

	await assertLedgerLeavesNonNegative(investment, existing._id.toString(), {
		amount: nextAmount,
		currency: nextCurrency,
		date: nextDate,
	});

	if (input.note !== undefined) existing.note = input.note ?? null;
	existing.amount = nextAmount;
	existing.currency = nextCurrency;
	existing.date = nextDate;
	await existing.save();
	await recomputeInvestmentBalance(investment);

	const [transaction, publicInvestment] = await Promise.all([
		toPublicInvestmentTransaction(existing, userCurrency),
		toInvestmentResponse(investment, userCurrency),
	]);
	return { transaction, investment: publicInvestment };
}

export async function deleteTransaction(userId: string, investmentId: string, transactionId: string) {
	const { investment, existing } = await findOwnedTransaction(userId, investmentId, transactionId);
	assertActive(investment);
	const userCurrency = await getUserCurrency(userId);

	if (existing.source === InvestmentTransactionSource.Withdrawal) {
		const [oldPreferred, position] = await Promise.all([
			convertAmount(existing.amount, existing.currency, userCurrency, existing.date),
			getMoneyPosition(userId),
		]);
		const extra = round2(0 - oldPreferred);
		if (extra > position.available) {
			throw new AppError(messages.SAVINGS_AMOUNT_EXCEEDS_AVAILABLE, 422);
		}
	}

	await assertLedgerLeavesNonNegative(investment, existing._id.toString(), null);
	await InvestmentTransactionModel.deleteOne({ _id: existing._id, userId });
	await recomputeInvestmentBalance(investment);
	return toInvestmentResponse(investment, userCurrency);
}
