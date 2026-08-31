import { Types } from 'mongoose';
import { messages } from '../../config/messages.js';
import {
	CategoryKind,
	SavingsContributionSource,
	SavingsGoalStatus,
	TransactionType,
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
import { CategoryModel } from '../category/category.model.js';
import { CurrencyModel } from '../currency/currency.model.js';
import { toPublicTransaction } from '../transaction/transaction.mapper.js';
import { TransactionModel, type TransactionDocument } from '../transaction/transaction.model.js';
import { UserModel } from '../user/user.model.js';
import {
	toPublicContribution,
	toPublicSavingsGoal,
	type ContributionExpenseOverlay,
} from './savings-goal.mapper.js';
import { SavingsGoalContributionModel } from './savings-goal-contribution.model.js';
import { SavingsGoalModel, type SavingsGoalDocument } from './savings-goal.model.js';
import type {
	CreateContributionBody,
	CreateSavingsGoalBody,
	ListContributionsQuery,
	ListSavingsGoalsQuery,
	ReturnFromGoalBody,
	SpendFromGoalBody,
	StartingBalanceBody,
	UpdateContributionBody,
	UpdateSavingsGoalBody,
} from './savings-goal.validation.js';

function isSetAsideSource(source: string): boolean {
	return (
		source === SavingsContributionSource.Manual || source === SavingsContributionSource.SetAside
	);
}

function isGoalCreditSource(source: string): boolean {
	return isSetAsideSource(source) || source === SavingsContributionSource.StartingBalance;
}

function isEditableContributionSource(source: string): boolean {
	return (
		isGoalCreditSource(source) ||
		source === SavingsContributionSource.GoalSpend ||
		source === SavingsContributionSource.ReturnToAvailable
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

async function findOwnedGoal(userId: string, goalId: string): Promise<SavingsGoalDocument> {
	const goal = await SavingsGoalModel.findOne({ _id: goalId, userId });
	if (!goal) {
		throw new AppError(messages.SAVINGS_GOAL_NOT_FOUND, 404);
	}
	return goal;
}

function resolveStatus(goal: SavingsGoalDocument): void {
	if (goal.status === SavingsGoalStatus.Cancelled) {
		return;
	}
	if (goal.currentAmount >= goal.targetAmount) {
		goal.status = SavingsGoalStatus.Completed;
	} else if (goal.status === SavingsGoalStatus.Completed) {
		goal.status = SavingsGoalStatus.Active;
	}
}

async function recomputeGoalProgress(goal: SavingsGoalDocument): Promise<void> {
	const contributions = await SavingsGoalContributionModel.find({ goalId: goal._id }).lean();
	let total = 0;
	for (const row of contributions) {
		total += await convertAmount(row.amount, row.currency, goal.currency, row.date);
	}
	goal.currentAmount = round2(Math.max(0, total));
	resolveStatus(goal);
	await goal.save();
}

async function assertAmountWithinGoal(
	goal: SavingsGoalDocument,
	amount: number,
	currency: string,
	date: Date,
	extraRoom = 0,
): Promise<void> {
	const needed = round2(await convertAmount(amount, currency, goal.currency, date));
	const room = round2(goal.currentAmount + extraRoom);
	if (needed > room) {
		throw new AppError(messages.SAVINGS_AMOUNT_EXCEEDS_GOAL, 422);
	}
}

async function assertExpenseCategory(
	userId: string,
	categoryId: string,
	subcategoryId: string | null | undefined,
): Promise<void> {
	const main = await CategoryModel.findOne({ _id: categoryId, userId });
	if (!main || main.parentCategoryId !== null) {
		throw new AppError(messages.TRANSACTION_CATEGORY_INVALID, 404);
	}
	if (main.kind !== CategoryKind.Expense) {
		throw new AppError(messages.TRANSACTION_CATEGORY_INVALID, 422);
	}
	if (subcategoryId) {
		const sub = await CategoryModel.findOne({ _id: subcategoryId, userId });
		if (!sub || !sub.parentCategoryId || sub.parentCategoryId.toString() !== categoryId) {
			throw new AppError(messages.TRANSACTION_CATEGORY_INVALID, 404);
		}
		if (sub.kind !== CategoryKind.Expense) {
			throw new AppError(messages.TRANSACTION_CATEGORY_INVALID, 422);
		}
	}
}

function assertGoalAllowsSpend(goal: SavingsGoalDocument): void {
	if (goal.status === SavingsGoalStatus.Cancelled) {
		throw new AppError(messages.SAVINGS_GOAL_CANCELLED, 422);
	}
}

async function writeGoalSpendLedger(userId: string, goal: SavingsGoalDocument, txn: TransactionDocument) {
	await SavingsGoalContributionModel.create({
		goalId: goal._id,
		userId,
		amount: -txn.amount,
		currency: txn.currency,
		date: txn.date,
		note: txn.description || null,
		source: SavingsContributionSource.GoalSpend,
		transactionId: txn._id,
	});
	await recomputeGoalProgress(goal);
}

function expenseOverlay(
	txn: Pick<TransactionDocument, 'categoryId' | 'subcategoryId' | 'description'> | null | undefined,
): ContributionExpenseOverlay | null {
	if (!txn) {
		return null;
	}
	return {
		categoryId: txn.categoryId.toString(),
		subcategoryId: txn.subcategoryId ? txn.subcategoryId.toString() : null,
		description: txn.description ?? '',
	};
}

async function expenseOverlaysByTransactionId(
	userId: string,
	transactionIds: Array<string | null | undefined>,
): Promise<Map<string, ContributionExpenseOverlay>> {
	const ids = [...new Set(transactionIds.filter((id): id is string => Boolean(id)))];
	if (ids.length === 0) {
		return new Map();
	}
	const txns = await TransactionModel.find({ _id: { $in: ids }, userId }).select(
		'categoryId subcategoryId description',
	);
	return new Map(txns.map((txn) => [txn._id.toString(), expenseOverlay(txn)!]));
}

function nextSignedLedgerAmount(source: string, existingAmount: number, inputAmount: number | undefined): number {
	if (inputAmount === undefined) {
		return existingAmount;
	}
	if (isGoalCreditSource(source)) {
		return inputAmount;
	}
	return -inputAmount;
}

function hasExpensePatchFields(input: UpdateContributionBody): boolean {
	return (
		input.categoryId !== undefined ||
		input.subcategoryId !== undefined ||
		input.description !== undefined
	);
}

async function assertLedgerLeavesNonNegativeGoal(
	goal: SavingsGoalDocument,
	contributionId: string,
	next: { amount: number; currency: string; date: Date } | null,
	source: string,
): Promise<void> {
	const siblings = await SavingsGoalContributionModel.find({ goalId: goal._id }).lean();
	let remainingTotal = 0;
	for (const row of siblings) {
		if (row._id.toString() === contributionId) {
			if (next === null) {
				continue;
			}
			remainingTotal += await convertAmount(next.amount, next.currency, goal.currency, next.date);
		} else {
			remainingTotal += await convertAmount(row.amount, row.currency, goal.currency, row.date);
		}
	}
	if (round2(remainingTotal) < 0) {
		throw new AppError(
			isGoalCreditSource(source) ? messages.SAVINGS_CONTRIBUTION_IN_USE : messages.SAVINGS_AMOUNT_EXCEEDS_GOAL,
			422,
		);
	}
}

async function toGoalResponse(goal: SavingsGoalDocument, userCurrency: string) {
	const rows = await SavingsGoalContributionModel.find({ goalId: goal._id })
		.select('amount currency date')
		.lean();
	const currentAmountPreferred = await sumInPreferred(rows, userCurrency);
	return toPublicSavingsGoal(goal, userCurrency, currentAmountPreferred);
}

export async function createSavingsGoal(userId: string, input: CreateSavingsGoalBody) {
	const userCurrency = await getUserCurrency(userId);
	const currency = input.currency ?? userCurrency;
	await assertEnabledCurrency(currency);

	const startingAmount = input.startingAmount ?? 0;
	const goal = await SavingsGoalModel.create({
		userId,
		name: input.name,
		targetAmount: input.targetAmount,
		currency,
		currentAmount: 0,
		targetDate: input.targetDate ?? null,
		status: SavingsGoalStatus.Active,
	});

	if (startingAmount > 0) {
		await SavingsGoalContributionModel.create({
			goalId: goal._id,
			userId,
			amount: startingAmount,
			currency,
			date: new Date(),
			note: null,
			source: SavingsContributionSource.StartingBalance,
			transactionId: null,
		});
		await recomputeGoalProgress(goal);
	}

	return toGoalResponse(goal, userCurrency);
}

export async function listSavingsGoals(userId: string, query: ListSavingsGoalsQuery) {
	const userCurrency = await getUserCurrency(userId);
	const filter: Record<string, unknown> = { userId };
	if (query.status) {
		filter.status = query.status;
	}

	const [goals, position] = await Promise.all([
		SavingsGoalModel.find(filter).sort({ createdAt: -1 }),
		getMoneyPosition(userId),
	]);

	const publicGoals = await Promise.all(
		goals.map((goal) =>
			toPublicSavingsGoal(goal, userCurrency, position.inGoalsByGoalId.get(goal._id.toString()) ?? 0),
		),
	);

	return {
		goals: publicGoals,
		money: toPublicMoneyPosition(position),
	};
}

export async function getSavingsGoal(userId: string, goalId: string) {
	const userCurrency = await getUserCurrency(userId);
	const goal = await findOwnedGoal(userId, goalId);
	return toGoalResponse(goal, userCurrency);
}

export async function updateSavingsGoal(userId: string, goalId: string, input: UpdateSavingsGoalBody) {
	const goal = await findOwnedGoal(userId, goalId);

	if (input.name !== undefined) goal.name = input.name;
	if (input.targetAmount !== undefined) goal.targetAmount = input.targetAmount;
	if (input.targetDate !== undefined) goal.targetDate = input.targetDate ?? null;
	if (input.status !== undefined) goal.status = input.status;

	resolveStatus(goal);
	await goal.save();

	const userCurrency = await getUserCurrency(userId);
	return toGoalResponse(goal, userCurrency);
}

export async function deleteSavingsGoal(userId: string, goalId: string) {
	const goal = await findOwnedGoal(userId, goalId);
	await TransactionModel.updateMany(
		{ userId, fundedFromGoalId: goal._id },
		{ $set: { fundedFromGoalId: null } },
	);
	await SavingsGoalContributionModel.deleteMany({ goalId: goal._id, userId });
	await SavingsGoalModel.deleteOne({ _id: goal._id, userId });
}

export async function addStartingBalance(userId: string, goalId: string, input: StartingBalanceBody) {
	const goal = await findOwnedGoal(userId, goalId);
	if (goal.status === SavingsGoalStatus.Cancelled) {
		throw new AppError(messages.SAVINGS_GOAL_CANCELLED, 422);
	}

	const userCurrency = await getUserCurrency(userId);
	const currency = input.currency ?? userCurrency;
	await assertEnabledCurrency(currency);

	const contribution = await SavingsGoalContributionModel.create({
		goalId: goal._id,
		userId,
		amount: input.amount,
		currency,
		date: input.date ?? new Date(),
		note: null,
		source: SavingsContributionSource.StartingBalance,
		transactionId: null,
	});

	await recomputeGoalProgress(goal);

	const [publicContribution, publicGoal] = await Promise.all([
		toPublicContribution(contribution, userCurrency),
		toGoalResponse(goal, userCurrency),
	]);

	return {
		contribution: publicContribution,
		goal: publicGoal,
	};
}

export async function addContribution(userId: string, goalId: string, input: CreateContributionBody) {
	const goal = await findOwnedGoal(userId, goalId);
	if (goal.status === SavingsGoalStatus.Cancelled) {
		throw new AppError(messages.SAVINGS_GOAL_CANCELLED, 422);
	}

	const userCurrency = await getUserCurrency(userId);
	const currency = input.currency ?? userCurrency;
	await assertEnabledCurrency(currency);

	const date = input.date ?? new Date();
	await assertAmountWithinAvailable(userId, input.amount, currency, date);

	const contribution = await SavingsGoalContributionModel.create({
		goalId: goal._id,
		userId,
		amount: input.amount,
		currency,
		date,
		note: input.note ?? null,
		source: SavingsContributionSource.SetAside,
		transactionId: null,
	});

	await recomputeGoalProgress(goal);

	const [publicContribution, publicGoal] = await Promise.all([
		toPublicContribution(contribution, userCurrency),
		toGoalResponse(goal, userCurrency),
	]);

	return {
		contribution: publicContribution,
		goal: publicGoal,
	};
}

export async function spendFromGoal(userId: string, goalId: string, input: SpendFromGoalBody) {
	const goal = await findOwnedGoal(userId, goalId);
	assertGoalAllowsSpend(goal);

	const userCurrency = await getUserCurrency(userId);
	const currency = input.currency ?? userCurrency;
	await assertEnabledCurrency(currency);
	await assertExpenseCategory(userId, input.categoryId, input.subcategoryId);

	const date = input.date ?? new Date();
	const description = input.description ?? input.note ?? '';
	await assertAmountWithinGoal(goal, input.amount, currency, date);

	const txn = await TransactionModel.create({
		userId,
		type: TransactionType.Expense,
		amount: input.amount,
		currency,
		categoryId: input.categoryId,
		subcategoryId: input.subcategoryId ?? null,
		description,
		date,
		fundedFromGoalId: goal._id,
	});

	try {
		await writeGoalSpendLedger(userId, goal, txn);
	} catch (err) {
		await TransactionModel.deleteOne({ _id: txn._id, userId });
		throw err;
	}

	const ledger = await SavingsGoalContributionModel.findOne({
		transactionId: txn._id,
		userId,
		source: SavingsContributionSource.GoalSpend,
	});
	if (!ledger) {
		throw new AppError(messages.SOMETHING_WENT_WRONG, 500);
	}

	const [transaction, contribution, publicGoal] = await Promise.all([
		toPublicTransaction(txn, userCurrency),
		toPublicContribution(ledger, userCurrency, expenseOverlay(txn)),
		toGoalResponse(goal, userCurrency),
	]);

	return { transaction, contribution, goal: publicGoal };
}

export async function returnFromGoal(userId: string, goalId: string, input: ReturnFromGoalBody) {
	const goal = await findOwnedGoal(userId, goalId);
	const userCurrency = await getUserCurrency(userId);
	const date = input.date ?? new Date();
	const cancel = input.cancel === true;

	if (cancel || input.amount === undefined) {
		if (goal.currentAmount > 0) {
			await SavingsGoalContributionModel.create({
				goalId: goal._id,
				userId,
				amount: -goal.currentAmount,
				currency: goal.currency,
				date,
				note: input.note ?? null,
				source: SavingsContributionSource.ReturnToAvailable,
				transactionId: null,
			});
			await recomputeGoalProgress(goal);
		}
		if (cancel) {
			goal.status = SavingsGoalStatus.Cancelled;
			await goal.save();
		}
	} else {
		const currency = input.currency ?? userCurrency;
		await assertEnabledCurrency(currency);
		await assertAmountWithinGoal(goal, input.amount, currency, date);
		await SavingsGoalContributionModel.create({
			goalId: goal._id,
			userId,
			amount: -input.amount,
			currency,
			date,
			note: input.note ?? null,
			source: SavingsContributionSource.ReturnToAvailable,
			transactionId: null,
		});
		await recomputeGoalProgress(goal);
	}

	const contribution = await SavingsGoalContributionModel.findOne({
		goalId: goal._id,
		userId,
		source: SavingsContributionSource.ReturnToAvailable,
	}).sort({ createdAt: -1 });

	return {
		contribution: contribution ? await toPublicContribution(contribution, userCurrency) : null,
		goal: await toGoalResponse(goal, userCurrency),
	};
}

export async function listContributions(userId: string, goalId: string, query: ListContributionsQuery) {
	await findOwnedGoal(userId, goalId);
	const userCurrency = await getUserCurrency(userId);
	const page = query.page;
	const limit = query.limit;
	const skip = (page - 1) * limit;
	const filter = { goalId, userId };

	const [rows, total] = await Promise.all([
		SavingsGoalContributionModel.find(filter).sort({ date: -1, createdAt: -1 }).skip(skip).limit(limit),
		SavingsGoalContributionModel.countDocuments(filter),
	]);

	const overlays = await expenseOverlaysByTransactionId(
		userId,
		rows.map((row) => (row.transactionId ? row.transactionId.toString() : null)),
	);

	return {
		items: await Promise.all(
			rows.map((row) =>
				toPublicContribution(
					row,
					userCurrency,
					row.transactionId ? overlays.get(row.transactionId.toString()) ?? null : null,
				),
			),
		),
		page,
		limit,
		total,
		totalPages: Math.ceil(total / limit) || 0,
	};
}

async function findOwnedContribution(userId: string, goalId: string, contributionId: string) {
	const goal = await findOwnedGoal(userId, goalId);
	const existing = await SavingsGoalContributionModel.findOne({
		_id: contributionId,
		goalId: goal._id,
		userId,
	});
	if (!existing) {
		throw new AppError(messages.SAVINGS_CONTRIBUTION_NOT_FOUND, 404);
	}
	const source = existing.source;
	if (!isEditableContributionSource(source)) {
		throw new AppError(messages.SAVINGS_CONTRIBUTION_NOT_REMOVABLE, 422);
	}
	return { goal, existing };
}

export async function updateContribution(
	userId: string,
	goalId: string,
	contributionId: string,
	input: UpdateContributionBody,
) {
	const { goal, existing } = await findOwnedContribution(userId, goalId, contributionId);
	const userCurrency = await getUserCurrency(userId);
	const isGoalSpend = existing.source === SavingsContributionSource.GoalSpend;

	if (hasExpensePatchFields(input) && !isGoalSpend) {
		throw new AppError(messages.SAVINGS_CONTRIBUTION_EXPENSE_FIELDS, 422);
	}

	const nextAmount = nextSignedLedgerAmount(existing.source, existing.amount, input.amount);
	const nextCurrency = input.currency ?? existing.currency;
	const nextDate = input.date ?? existing.date;

	if (input.currency !== undefined) {
		await assertEnabledCurrency(nextCurrency);
	}

	if (isSetAsideSource(existing.source) || existing.source === SavingsContributionSource.ReturnToAvailable) {
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

	await assertLedgerLeavesNonNegativeGoal(
		goal,
		existing._id.toString(),
		{
			amount: nextAmount,
			currency: nextCurrency,
			date: nextDate,
		},
		existing.source,
	);

	let overlay: ContributionExpenseOverlay | null = null;

	if (isGoalSpend) {
		if (!existing.transactionId) {
			throw new AppError(messages.TRANSACTION_NOT_FOUND, 404);
		}
		const txn = await TransactionModel.findOne({
			_id: existing.transactionId,
			userId,
			fundedFromGoalId: goal._id,
		});
		if (!txn) {
			throw new AppError(messages.TRANSACTION_NOT_FOUND, 404);
		}

		const nextCategoryId = input.categoryId ?? txn.categoryId.toString();
		const nextSubcategoryId =
			input.subcategoryId !== undefined
				? input.subcategoryId
				: txn.subcategoryId
					? txn.subcategoryId.toString()
					: null;
		const nextDescription =
			input.description !== undefined
				? input.description
				: input.note !== undefined
					? (input.note ?? '')
					: (txn.description ?? '');

		if (input.categoryId !== undefined || input.subcategoryId !== undefined) {
			await assertExpenseCategory(userId, nextCategoryId, nextSubcategoryId);
		}

		txn.amount = Math.abs(nextAmount);
		txn.currency = nextCurrency;
		txn.date = nextDate;
		txn.categoryId = new Types.ObjectId(nextCategoryId);
		txn.subcategoryId = nextSubcategoryId ? new Types.ObjectId(nextSubcategoryId) : null;
		txn.description = nextDescription;
		await txn.save();

		existing.note = nextDescription || null;
		overlay = expenseOverlay(txn);
	} else if (input.note !== undefined) {
		existing.note = input.note ?? null;
	}

	existing.amount = nextAmount;
	existing.currency = nextCurrency;
	existing.date = nextDate;
	await existing.save();
	await recomputeGoalProgress(goal);

	const [contribution, publicGoal] = await Promise.all([
		toPublicContribution(existing, userCurrency, overlay),
		toGoalResponse(goal, userCurrency),
	]);
	return { contribution, goal: publicGoal };
}

export async function deleteContribution(userId: string, goalId: string, contributionId: string) {
	const { goal, existing } = await findOwnedContribution(userId, goalId, contributionId);

	if (existing.source === SavingsContributionSource.ReturnToAvailable) {
		const userCurrency = await getUserCurrency(userId);
		const [oldPreferred, position] = await Promise.all([
			convertAmount(existing.amount, existing.currency, userCurrency, existing.date),
			getMoneyPosition(userId),
		]);
		const extra = round2(0 - oldPreferred);
		if (extra > position.available) {
			throw new AppError(messages.SAVINGS_AMOUNT_EXCEEDS_AVAILABLE, 422);
		}
	}

	await assertLedgerLeavesNonNegativeGoal(goal, existing._id.toString(), null, existing.source);

	if (existing.source === SavingsContributionSource.GoalSpend && existing.transactionId) {
		await TransactionModel.deleteOne({ _id: existing.transactionId, userId });
	}

	await SavingsGoalContributionModel.deleteOne({ _id: existing._id, userId });
	await recomputeGoalProgress(goal);
	const userCurrency = await getUserCurrency(userId);
	return toGoalResponse(goal, userCurrency);
}
