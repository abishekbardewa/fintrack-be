import { messages } from '../../config/messages.js';
import {
	InvestmentTransactionSource,
	SavingTransactionSource,
	SavingsCircleTransactionSource,
	SavingsContributionSource,
	TransactionType,
} from '../../config/enums.js';
import { AppError } from '../errors/AppError.js';
import { sumInPreferred } from '../utils/aggregateFx.js';
import { convertAmount } from '../utils/fx.js';
import { round2 } from '../utils/money.js';
import { InvestmentModel } from '../../modules/investment/investment.model.js';
import { InvestmentTransactionModel } from '../../modules/investment/investment-transaction.model.js';
import { SavingModel } from '../../modules/saving/saving.model.js';
import { SavingTransactionModel } from '../../modules/saving/saving-transaction.model.js';
import { SavingsCircleModel } from '../../modules/savings-circle/savings-circle.model.js';
import { SavingsCircleTransactionModel } from '../../modules/savings-circle/savings-circle-transaction.model.js';
import { SavingsGoalContributionModel } from '../../modules/savings-goal/savings-goal-contribution.model.js';
import { TransactionModel } from '../../modules/transaction/transaction.model.js';
import { UserModel } from '../../modules/user/user.model.js';
import { resolveOpeningBalance } from '../../modules/user/user.mapper.js';

function isSpendableGoalMovement(source: string | undefined): boolean {
	return (
		source === SavingsContributionSource.Manual ||
		source === SavingsContributionSource.SetAside ||
		source === SavingsContributionSource.ReturnToAvailable
	);
}

function isSpendableSavingMovement(source: string | undefined): boolean {
	return (
		source === SavingTransactionSource.Contribution ||
		source === SavingTransactionSource.Withdrawal
	);
}

function isSpendableCircleMovement(source: string | undefined): boolean {
	return (
		source === SavingsCircleTransactionSource.Contribution ||
		source === SavingsCircleTransactionSource.PayoutToSpendable
	);
}

function isSpendableInvestmentMovement(source: string | undefined): boolean {
	return (
		source === InvestmentTransactionSource.Contribution ||
		source === InvestmentTransactionSource.Withdrawal
	);
}

export type MoneyPosition = {
	preferred: string;
	openingBalance: number;
	startingBalance: number;
	balance: number;
	financialPosition: number;
	inGoals: number;
	inSavings: number;
	inInvestments: number;
	available: number;
	spendable: number;
	inGoalsByGoalId: Map<string, number>;
};

export async function getMoneyPosition(userId: string): Promise<MoneyPosition> {
	const user = await UserModel.findById(userId).select('currency openingBalance');
	if (!user) {
		throw new AppError(messages.USER_NOT_FOUND, 404);
	}

	const preferred = user.currency;
	const opening = resolveOpeningBalance(user);

	const [
		txns,
		contributions,
		savingRows,
		circleRows,
		investmentRows,
		liveSavingIds,
		liveCircleIds,
		liveInvestmentIds,
		openingPreferred,
	] = await Promise.all([
		TransactionModel.find({ userId }).select('type amount currency date fundedFromGoalId').lean(),
		SavingsGoalContributionModel.find({ userId }).select('goalId amount currency date source').lean(),
		SavingTransactionModel.find({ userId }).select('savingId amount currency date source').lean(),
		SavingsCircleTransactionModel.find({ userId })
			.select('circleId amount currency date source')
			.lean(),
		InvestmentTransactionModel.find({ userId }).select('investmentId amount currency date source').lean(),
		SavingModel.find({ userId, kind: { $ne: 'savings_circle' } }).distinct('_id'),
		SavingsCircleModel.find({ userId }).distinct('_id'),
		InvestmentModel.find({ userId }).distinct('_id'),
		opening.amount === 0
			? Promise.resolve(0)
			: convertAmount(opening.amount, opening.currency, preferred, opening.setAt ?? new Date()),
	]);

	const liveSavingIdSet = new Set(liveSavingIds.map((id) => id.toString()));
	const liveSavingRows = savingRows.filter((row) => liveSavingIdSet.has(row.savingId.toString()));
	const orphanSpendableSavingRows = savingRows.filter(
		(row) =>
			!liveSavingIdSet.has(row.savingId.toString()) && isSpendableSavingMovement(row.source),
	);

	const liveCircleIdSet = new Set(liveCircleIds.map((id) => id.toString()));
	const liveCircleRows = circleRows.filter((row) => liveCircleIdSet.has(row.circleId.toString()));
	const orphanSpendableCircleRows = circleRows.filter(
		(row) =>
			!liveCircleIdSet.has(row.circleId.toString()) && isSpendableCircleMovement(row.source),
	);

	const liveInvestmentIdSet = new Set(liveInvestmentIds.map((id) => id.toString()));
	const liveInvestmentRows = investmentRows.filter((row) =>
		liveInvestmentIdSet.has(row.investmentId.toString()),
	);
	const orphanSpendableInvestmentRows = investmentRows.filter(
		(row) =>
			!liveInvestmentIdSet.has(row.investmentId.toString()) &&
			isSpendableInvestmentMovement(row.source),
	);

	const [income, spendableExpenses] = await Promise.all([
		sumInPreferred(
			txns.filter((row) => row.type === TransactionType.Income),
			preferred,
		),
		sumInPreferred(
			txns.filter((row) => row.type === TransactionType.Expense && !row.fundedFromGoalId),
			preferred,
		),
	]);

	const inGoalsByGoalId = new Map<string, number>();
	const grouped = new Map<string, typeof contributions>();
	for (const row of contributions) {
		const goalId = row.goalId.toString();
		const list = grouped.get(goalId);
		if (list) {
			list.push(row);
		} else {
			grouped.set(goalId, [row]);
		}
	}

	let inGoals = 0;
	for (const [goalId, rows] of grouped.entries()) {
		const total = await sumInPreferred(rows, preferred);
		inGoalsByGoalId.set(goalId, total);
		inGoals = round2(inGoals + total);
	}

	const openingBalance = round2(openingPreferred);
	const inSavings = await sumInPreferred(liveSavingRows, preferred);
	const inInvestments = await sumInPreferred(liveInvestmentRows, preferred);
	const [
		spendableGoalAllocations,
		spendableSavingMovements,
		spendableCircleMovements,
		spendableInvestmentMovements,
	] = await Promise.all([
		sumInPreferred(
			contributions.filter((row) => isSpendableGoalMovement(row.source)),
			preferred,
		),
		sumInPreferred(
			[
				...liveSavingRows.filter((row) => isSpendableSavingMovement(row.source)),
				...orphanSpendableSavingRows,
			],
			preferred,
		),
		sumInPreferred(
			[
				...liveCircleRows.filter((row) => isSpendableCircleMovement(row.source)),
				...orphanSpendableCircleRows,
			],
			preferred,
		),
		sumInPreferred(
			[
				...liveInvestmentRows.filter((row) => isSpendableInvestmentMovement(row.source)),
				...orphanSpendableInvestmentRows,
			],
			preferred,
		),
	]);
	const available = round2(
		openingBalance +
			income -
			spendableExpenses -
			spendableGoalAllocations -
			spendableSavingMovements -
			spendableCircleMovements -
			spendableInvestmentMovements,
	);
	const financialPosition = round2(available + inGoals + inSavings + inInvestments);

	return {
		preferred,
		openingBalance,
		startingBalance: openingBalance,
		balance: financialPosition,
		financialPosition,
		inGoals,
		inSavings,
		inInvestments,
		available,
		spendable: available,
		inGoalsByGoalId,
	};
}

export function toPublicMoneyPosition(position: MoneyPosition) {
	return {
		startingBalance: position.startingBalance,
		openingBalance: position.openingBalance,
		spendable: position.spendable,
		available: position.available,
		inGoals: position.inGoals,
		inSavings: position.inSavings,
		inInvestments: position.inInvestments,
		financialPosition: position.financialPosition,
		balance: position.balance,
	};
}

export async function assertAmountWithinAvailable(
	userId: string,
	amount: number,
	currency: string,
	date: Date,
): Promise<void> {
	const position = await getMoneyPosition(userId);
	const needed = round2(await convertAmount(amount, currency, position.preferred, date));
	if (needed > position.available) {
		throw new AppError(messages.SAVINGS_AMOUNT_EXCEEDS_AVAILABLE, 422);
	}
}
