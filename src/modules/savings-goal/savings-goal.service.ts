import { limits } from '../../config/limits.js';
import { messages } from '../../config/messages.js';
import { SavingsContributionSource, SavingsGoalStatus } from '../../config/enums.js';
import { AppError } from '../../shared/errors/AppError.js';
import { convertAmount } from '../../shared/utils/fx.js';
import { CurrencyModel } from '../currency/currency.model.js';
import { UserModel } from '../user/user.model.js';
import { toPublicContribution, toPublicSavingsGoal } from './savings-goal.mapper.js';
import { SavingsGoalContributionModel } from './savings-goal-contribution.model.js';
import { SavingsGoalModel, type SavingsGoalDocument } from './savings-goal.model.js';
import type {
	CreateContributionBody,
	CreateSavingsGoalBody,
	ListSavingsGoalsQuery,
	UpdateSavingsGoalBody,
} from './savings-goal.validation.js';

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
	goal.currentAmount = Math.round(total * 100) / 100;
	resolveStatus(goal);
	await goal.save();
}

export async function createSavingsGoal(userId: string, input: CreateSavingsGoalBody) {
	const userCurrency = await getUserCurrency(userId);
	const currency = input.currency ?? userCurrency;
	await assertEnabledCurrency(currency);

	const activeCount = await SavingsGoalModel.countDocuments({
		userId,
		status: SavingsGoalStatus.Active,
	});
	if (activeCount >= limits.maxActiveSavingsGoals) {
		throw new AppError(messages.SAVINGS_GOAL_ACTIVE_CAP, 422);
	}

	const goal = await SavingsGoalModel.create({
		userId,
		name: input.name,
		targetAmount: input.targetAmount,
		currency,
		currentAmount: 0,
		targetDate: input.targetDate ?? null,
		status: SavingsGoalStatus.Active,
	});

	if (input.initialAmount !== undefined) {
		await SavingsGoalContributionModel.create({
			goalId: goal._id,
			userId,
			amount: input.initialAmount,
			currency,
			date: input.initialDate ?? new Date(),
			note: null,
			source: SavingsContributionSource.Manual,
			transactionId: null,
		});
		await recomputeGoalProgress(goal);
	}

	return toPublicSavingsGoal(goal, userCurrency);
}

export async function listSavingsGoals(userId: string, query: ListSavingsGoalsQuery) {
	const userCurrency = await getUserCurrency(userId);
	const filter: Record<string, unknown> = { userId };
	if (query.status) {
		filter.status = query.status;
	}

	const goals = await SavingsGoalModel.find(filter).sort({ createdAt: -1 });
	return Promise.all(goals.map((goal) => toPublicSavingsGoal(goal, userCurrency)));
}

export async function getSavingsGoal(userId: string, goalId: string) {
	const userCurrency = await getUserCurrency(userId);
	const goal = await findOwnedGoal(userId, goalId);
	return toPublicSavingsGoal(goal, userCurrency);
}

export async function updateSavingsGoal(userId: string, goalId: string, input: UpdateSavingsGoalBody) {
	const goal = await findOwnedGoal(userId, goalId);

	if (
		input.status === SavingsGoalStatus.Active &&
		goal.status !== SavingsGoalStatus.Active &&
		goal.status !== SavingsGoalStatus.Completed
	) {
		const activeCount = await SavingsGoalModel.countDocuments({
			userId,
			status: SavingsGoalStatus.Active,
			_id: { $ne: goal._id },
		});
		if (activeCount >= limits.maxActiveSavingsGoals) {
			throw new AppError(messages.SAVINGS_GOAL_ACTIVE_CAP, 422);
		}
	}

	if (input.name !== undefined) goal.name = input.name;
	if (input.targetAmount !== undefined) goal.targetAmount = input.targetAmount;
	if (input.targetDate !== undefined) goal.targetDate = input.targetDate ?? null;
	if (input.status !== undefined) goal.status = input.status;

	resolveStatus(goal);
	await goal.save();

	const userCurrency = await getUserCurrency(userId);
	return toPublicSavingsGoal(goal, userCurrency);
}

export async function deleteSavingsGoal(userId: string, goalId: string) {
	const goal = await findOwnedGoal(userId, goalId);
	await SavingsGoalContributionModel.deleteMany({ goalId: goal._id, userId });
	await SavingsGoalModel.deleteOne({ _id: goal._id, userId });
}

export async function addContribution(userId: string, goalId: string, input: CreateContributionBody) {
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
		note: input.note ?? null,
		source: SavingsContributionSource.Manual,
		transactionId: null,
	});

	await recomputeGoalProgress(goal);

	const [publicContribution, publicGoal] = await Promise.all([
		toPublicContribution(contribution, userCurrency),
		toPublicSavingsGoal(goal, userCurrency),
	]);

	return {
		contribution: publicContribution,
		goal: publicGoal,
	};
}

export async function listContributions(userId: string, goalId: string) {
	await findOwnedGoal(userId, goalId);
	const userCurrency = await getUserCurrency(userId);
	const rows = await SavingsGoalContributionModel.find({ goalId, userId }).sort({ date: -1, createdAt: -1 });
	return Promise.all(rows.map((row) => toPublicContribution(row, userCurrency)));
}

export async function deleteContribution(userId: string, goalId: string, contributionId: string) {
	const goal = await findOwnedGoal(userId, goalId);
	const result = await SavingsGoalContributionModel.deleteOne({
		_id: contributionId,
		goalId: goal._id,
		userId,
		source: SavingsContributionSource.Manual,
	});
	if (result.deletedCount === 0) {
		throw new AppError(messages.SAVINGS_CONTRIBUTION_NOT_FOUND, 404);
	}

	await recomputeGoalProgress(goal);
	const userCurrency = await getUserCurrency(userId);
	return toPublicSavingsGoal(goal, userCurrency);
}
