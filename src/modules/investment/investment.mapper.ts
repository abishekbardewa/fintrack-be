import type { Types } from 'mongoose';
import { toAmountPreferred } from '../../shared/utils/fx.js';
import type { InvestmentDocument } from './investment.model.js';
import type { InvestmentTransactionDocument } from './investment-transaction.model.js';

export type PublicInvestment = {
	id: string;
	name: string;
	currency: string;
	initialAmount: number;
	currentBalance: number;
	currentBalancePreferred: number;
	startDate: Date | null;
	closedAmount: number;
	notes: string | null;
	status: string;
	createdAt?: Date;
	updatedAt?: Date;
};

export type PublicInvestmentTransaction = {
	id: string;
	investmentId: string;
	amount: number;
	currency: string;
	amountPreferred: number;
	date: Date;
	note: string | null;
	source: string;
	createdAt?: Date;
	updatedAt?: Date;
};

export async function toPublicInvestment(
	investment: Pick<
		InvestmentDocument,
		| 'name'
		| 'currency'
		| 'initialAmount'
		| 'currentBalance'
		| 'startDate'
		| 'closedAmount'
		| 'notes'
		| 'status'
		| 'createdAt'
		| 'updatedAt'
	> & { _id: Types.ObjectId },
	_userCurrency: string,
	currentBalancePreferred: number,
): Promise<PublicInvestment> {
	return {
		id: investment._id.toString(),
		name: investment.name,
		currency: investment.currency,
		initialAmount: investment.initialAmount,
		currentBalance: investment.currentBalance,
		currentBalancePreferred,
		startDate: investment.startDate ?? null,
		closedAmount: investment.closedAmount ?? 0,
		notes: investment.notes ?? null,
		status: investment.status,
		createdAt: investment.createdAt,
		updatedAt: investment.updatedAt,
	};
}

export async function toPublicInvestmentTransaction(
	row: Pick<
		InvestmentTransactionDocument,
		'investmentId' | 'amount' | 'currency' | 'date' | 'note' | 'source' | 'createdAt' | 'updatedAt'
	> & { _id: Types.ObjectId },
	userCurrency: string,
): Promise<PublicInvestmentTransaction> {
	return {
		id: row._id.toString(),
		investmentId: row.investmentId.toString(),
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
