import type { Types } from 'mongoose';
import { toAmountPreferred } from '../../shared/utils/fx.js';
import type { SavingDocument } from './saving.model.js';
import type { SavingTransactionDocument } from './saving-transaction.model.js';

export type PublicSaving = {
	id: string;
	name: string;
	currency: string;
	currentAmount: number;
	currentAmountPreferred: number;
	notes: string | null;
	createdAt?: Date;
	updatedAt?: Date;
};

export type PublicSavingTransaction = {
	id: string;
	savingId: string;
	amount: number;
	currency: string;
	amountPreferred: number;
	date: Date;
	note: string | null;
	source: string;
	createdAt?: Date;
	updatedAt?: Date;
};

export async function toPublicSaving(
	saving: Pick<
		SavingDocument,
		'name' | 'currency' | 'currentAmount' | 'notes' | 'createdAt' | 'updatedAt'
	> & { _id: Types.ObjectId },
	_userCurrency: string,
	currentAmountPreferred: number,
): Promise<PublicSaving> {
	return {
		id: saving._id.toString(),
		name: saving.name,
		currency: saving.currency,
		currentAmount: saving.currentAmount,
		currentAmountPreferred,
		notes: saving.notes ?? null,
		createdAt: saving.createdAt,
		updatedAt: saving.updatedAt,
	};
}

export async function toPublicSavingTransaction(
	row: Pick<
		SavingTransactionDocument,
		'savingId' | 'amount' | 'currency' | 'date' | 'note' | 'source' | 'createdAt' | 'updatedAt'
	> & { _id: Types.ObjectId },
	userCurrency: string,
): Promise<PublicSavingTransaction> {
	return {
		id: row._id.toString(),
		savingId: row.savingId.toString(),
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
