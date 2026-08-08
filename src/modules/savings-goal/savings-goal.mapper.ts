import type { Types } from 'mongoose';
import { toAmountPreferred } from '../../shared/utils/fx.js';
import type { SavingsGoalDocument } from './savings-goal.model.js';
import type { SavingsGoalContributionDocument } from './savings-goal-contribution.model.js';

export type PublicSavingsGoal = {
	id: string;
	name: string;
	targetAmount: number;
	currency: string;
	currentAmount: number;
	targetAmountPreferred: number;
	currentAmountPreferred: number;
	percent: number;
	remaining: number;
	targetDate: Date | null;
	status: string;
	createdAt?: Date;
	updatedAt?: Date;
};

export type PublicContribution = {
	id: string;
	goalId: string;
	amount: number;
	currency: string;
	amountPreferred: number;
	date: Date;
	note: string | null;
	source: string;
	transactionId: string | null;
	createdAt?: Date;
	updatedAt?: Date;
};

function round2(n: number): number {
	return Math.round(n * 100) / 100;
}

export async function toPublicSavingsGoal(
	goal: Pick<
		SavingsGoalDocument,
		'name' | 'targetAmount' | 'currency' | 'currentAmount' | 'targetDate' | 'status' | 'createdAt' | 'updatedAt'
	> & { _id: Types.ObjectId },
	userCurrency: string,
): Promise<PublicSavingsGoal> {
	const target = goal.targetAmount;
	const current = goal.currentAmount;
	const percent = target > 0 ? round2(Math.min(100, (current / target) * 100)) : 0;
	const remaining = round2(Math.max(0, target - current));
	const [targetAmountPreferred, currentAmountPreferred] = await Promise.all([
		toAmountPreferred(target, goal.currency, userCurrency),
		toAmountPreferred(current, goal.currency, userCurrency),
	]);

	return {
		id: goal._id.toString(),
		name: goal.name,
		targetAmount: target,
		currency: goal.currency,
		currentAmount: current,
		targetAmountPreferred,
		currentAmountPreferred,
		percent,
		remaining,
		targetDate: goal.targetDate ?? null,
		status: goal.status,
		createdAt: goal.createdAt,
		updatedAt: goal.updatedAt,
	};
}

export async function toPublicContribution(
	row: Pick<
		SavingsGoalContributionDocument,
		'goalId' | 'amount' | 'currency' | 'date' | 'note' | 'source' | 'transactionId' | 'createdAt' | 'updatedAt'
	> & { _id: Types.ObjectId },
	userCurrency: string,
): Promise<PublicContribution> {
	return {
		id: row._id.toString(),
		goalId: row.goalId.toString(),
		amount: row.amount,
		currency: row.currency,
		amountPreferred: await toAmountPreferred(row.amount, row.currency, userCurrency, row.date),
		date: row.date,
		note: row.note ?? null,
		source: row.source,
		transactionId: row.transactionId ? row.transactionId.toString() : null,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}
