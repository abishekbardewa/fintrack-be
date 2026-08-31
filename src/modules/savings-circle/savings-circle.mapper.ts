import type { Types } from 'mongoose';
import { toAmountPreferred } from '../../shared/utils/fx.js';
import type { SavingsCircleDocument } from './savings-circle.model.js';
import type { SavingsCircleTransactionDocument } from './savings-circle-transaction.model.js';

export type PublicSavingsCircle = {
	id: string;
	name: string;
	currency: string;
	notes: string | null;
	status: string;
	contributionAmount: number;
	frequency: string;
	memberCount: number;
	startDate: Date;
	expectedPayout: number;
	pendingPayout: number;
	pendingPayoutPreferred: number;
	createdAt?: Date;
	updatedAt?: Date;
};

export type PublicSavingsCircleTransaction = {
	id: string;
	circleId: string;
	amount: number;
	currency: string;
	amountPreferred: number;
	date: Date;
	note: string | null;
	source: string;
	createdAt?: Date;
	updatedAt?: Date;
};

export async function toPublicSavingsCircle(
	circle: Pick<
		SavingsCircleDocument,
		| 'name'
		| 'currency'
		| 'notes'
		| 'status'
		| 'contributionAmount'
		| 'frequency'
		| 'memberCount'
		| 'startDate'
		| 'expectedPayout'
		| 'createdAt'
		| 'updatedAt'
	> & { _id: Types.ObjectId },
	pendingPayout: number,
	pendingPayoutPreferred: number,
): Promise<PublicSavingsCircle> {
	return {
		id: circle._id.toString(),
		name: circle.name,
		currency: circle.currency,
		notes: circle.notes ?? null,
		status: circle.status,
		contributionAmount: circle.contributionAmount,
		frequency: circle.frequency,
		memberCount: circle.memberCount,
		startDate: circle.startDate,
		expectedPayout: circle.expectedPayout,
		pendingPayout,
		pendingPayoutPreferred,
		createdAt: circle.createdAt,
		updatedAt: circle.updatedAt,
	};
}

export async function toPublicSavingsCircleTransaction(
	row: Pick<
		SavingsCircleTransactionDocument,
		'circleId' | 'amount' | 'currency' | 'date' | 'note' | 'source' | 'createdAt' | 'updatedAt'
	> & { _id: Types.ObjectId },
	userCurrency: string,
): Promise<PublicSavingsCircleTransaction> {
	return {
		id: row._id.toString(),
		circleId: row.circleId.toString(),
		amount: row.amount,
		currency: row.currency,
		amountPreferred: await toAmountPreferred(row.amount, row.currency, userCurrency, row.date),
		date: row.date,
		note: row.note ?? null,
		source: row.source,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}
