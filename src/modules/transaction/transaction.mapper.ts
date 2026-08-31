import type { Types } from 'mongoose';
import { toAmountPreferred } from '../../shared/utils/fx.js';
import type { TransactionDocument } from './transaction.model.js';

export type PublicTransaction = {
	id: string;
	type: string;
	amount: number;
	currency: string;
	amountPreferred: number;
	categoryId: string;
	subcategoryId: string | null;
	description: string;
	date: Date;
	fundedFromGoalId: string | null;
	createdAt?: Date;
	updatedAt?: Date;
};

export async function toPublicTransaction(
	txn: Pick<
		TransactionDocument,
		| 'type'
		| 'amount'
		| 'currency'
		| 'categoryId'
		| 'subcategoryId'
		| 'description'
		| 'date'
		| 'fundedFromGoalId'
		| 'createdAt'
		| 'updatedAt'
	> & { _id: Types.ObjectId },
	userCurrency: string,
): Promise<PublicTransaction> {
	return {
		id: txn._id.toString(),
		type: txn.type,
		amount: txn.amount,
		currency: txn.currency,
		amountPreferred: await toAmountPreferred(txn.amount, txn.currency, userCurrency, txn.date),
		categoryId: txn.categoryId.toString(),
		subcategoryId: txn.subcategoryId ? txn.subcategoryId.toString() : null,
		description: txn.description ?? '',
		date: txn.date,
		fundedFromGoalId: txn.fundedFromGoalId ? txn.fundedFromGoalId.toString() : null,
		createdAt: txn.createdAt,
		updatedAt: txn.updatedAt,
	};
}
