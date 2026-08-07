import type { Types } from 'mongoose';
import { limits } from '../../config/limits.js';
import { BudgetProgressStatus } from '../../config/enums.js';
import { toAmountPreferred } from '../../shared/utils/fx.js';
import type { BudgetDocument } from './budget.model.js';

export type PublicBudget = {
	id: string;
	periodType: string;
	categoryId: string | null;
	year: number | null;
	month: number | null;
	weekStart: Date | null;
	effectiveFrom: Date;
	effectiveTo: Date;
	limitAmount: number;
	currency: string;
	limitAmountPreferred: number;
	spent: number;
	spentPreferred: number;
	remaining: number;
	percent: number;
	status: string;
	createdAt?: Date;
	updatedAt?: Date;
};

function round2(n: number): number {
	return Math.round(n * 100) / 100;
}

export function computeBudgetProgress(limitAmount: number, spent: number) {
	const percent = limitAmount > 0 ? round2((spent / limitAmount) * 100) : 0;
	const remaining = round2(Math.max(0, limitAmount - spent));
	let status: string = BudgetProgressStatus.Ok;
	if (percent >= limits.budgetOverPercent) {
		status = BudgetProgressStatus.Over;
	} else if (percent >= limits.budgetWarningPercent) {
		status = BudgetProgressStatus.Warning;
	}
	return { percent, remaining, status };
}

export function toPublicBudget(
	budget: Pick<
		BudgetDocument,
		| 'periodType'
		| 'categoryId'
		| 'year'
		| 'month'
		| 'weekStart'
		| 'effectiveFrom'
		| 'effectiveTo'
		| 'limitAmount'
		| 'currency'
		| 'createdAt'
		| 'updatedAt'
	> & { _id: Types.ObjectId },
	spent: number,
	userCurrency: string,
): PublicBudget {
	const progress = computeBudgetProgress(budget.limitAmount, spent);
	return {
		id: budget._id.toString(),
		periodType: budget.periodType,
		categoryId: budget.categoryId ? budget.categoryId.toString() : null,
		year: budget.year ?? null,
		month: budget.month ?? null,
		weekStart: budget.weekStart ?? null,
		effectiveFrom: budget.effectiveFrom,
		effectiveTo: budget.effectiveTo,
		limitAmount: budget.limitAmount,
		currency: budget.currency,
		limitAmountPreferred: toAmountPreferred(budget.limitAmount, budget.currency, userCurrency),
		spent: round2(spent),
		spentPreferred: toAmountPreferred(spent, budget.currency, userCurrency),
		remaining: progress.remaining,
		percent: progress.percent,
		status: progress.status,
		createdAt: budget.createdAt,
		updatedAt: budget.updatedAt,
	};
}
