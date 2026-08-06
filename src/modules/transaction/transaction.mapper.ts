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
	createdAt?: Date;
	updatedAt?: Date;
};

export function toPublicTransaction(
	txn: Pick<
		TransactionDocument,
		'type' | 'amount' | 'currency' | 'categoryId' | 'subcategoryId' | 'description' | 'date' | 'createdAt' | 'updatedAt'
	> & { _id: Types.ObjectId },
	userCurrency: string,
): PublicTransaction {
	return {
		id: txn._id.toString(),
		type: txn.type,
		amount: txn.amount,
		currency: txn.currency,
		amountPreferred: toAmountPreferred(txn.amount, txn.currency, userCurrency),
		categoryId: txn.categoryId.toString(),
		subcategoryId: txn.subcategoryId ? txn.subcategoryId.toString() : null,
		description: txn.description ?? '',
		date: txn.date,
		createdAt: txn.createdAt,
		updatedAt: txn.updatedAt,
	};
}
