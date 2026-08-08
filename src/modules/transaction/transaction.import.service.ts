import { messages } from '../../config/messages.js';
import { AppError } from '../../shared/errors/AppError.js';
import { CategoryModel } from '../category/category.model.js';
import { CurrencyModel } from '../currency/currency.model.js';
import { UserModel } from '../user/user.model.js';
import { toPublicTransaction } from './transaction.mapper.js';
import { TransactionModel } from './transaction.model.js';
import type { ImportTransactionsBody } from './transaction.validation.js';

type CategoryDoc = {
	_id: { toString(): string };
	kind: string;
	parentCategoryId?: { toString(): string } | null;
};

export async function importTransactions(userId: string, input: ImportTransactionsBody) {
	const user = await UserModel.findById(userId).select('currency');
	if (!user) {
		throw new AppError(messages.USER_NOT_FOUND, 404);
	}
	const userCurrency = user.currency;

	const categoryIds = new Set<string>();
	for (const row of input.transactions) {
		categoryIds.add(row.categoryId);
		if (row.subcategoryId) {
			categoryIds.add(row.subcategoryId);
		}
	}

	const [categoryRows, enabledCurrencies] = await Promise.all([
		CategoryModel.find({ userId, _id: { $in: [...categoryIds] } })
			.select('kind parentCategoryId')
			.lean() as Promise<CategoryDoc[]>,
		CurrencyModel.find({ enabled: true }).select('code').lean(),
	]);

	const enabledCodes = new Set(enabledCurrencies.map((c) => c.code.toUpperCase()));
	const categoriesById = new Map(categoryRows.map((c) => [c._id.toString(), c]));

	const details: Array<{ field: string; message: string }> = [];
	const prepared: Array<{
		userId: string;
		type: string;
		amount: number;
		currency: string;
		categoryId: string;
		subcategoryId: string | null;
		description: string;
		date: Date;
	}> = [];

	for (const [index, row] of input.transactions.entries()) {
		const prefix = `transactions[${index}]`;
		const rowDetails: Array<{ field: string; message: string }> = [];
		const currency = (row.currency ?? userCurrency).toUpperCase();
		if (!enabledCodes.has(currency)) {
			rowDetails.push({ field: `${prefix}.currency`, message: messages.CURRENCY_INVALID });
		}

		const main = categoriesById.get(row.categoryId);
		if (!main || main.parentCategoryId != null) {
			rowDetails.push({
				field: `${prefix}.categoryId`,
				message: messages.TRANSACTION_CATEGORY_INVALID,
			});
		} else if (main.kind !== row.type) {
			rowDetails.push({
				field: `${prefix}.categoryId`,
				message: messages.TRANSACTION_CATEGORY_INVALID,
			});
		}

		let subcategoryId: string | null = null;
		if (row.subcategoryId) {
			const sub = categoriesById.get(row.subcategoryId);
			if (
				!sub ||
				sub.parentCategoryId == null ||
				sub.parentCategoryId.toString() !== row.categoryId ||
				sub.kind !== row.type
			) {
				rowDetails.push({
					field: `${prefix}.subcategoryId`,
					message: messages.TRANSACTION_CATEGORY_INVALID,
				});
			} else {
				subcategoryId = row.subcategoryId;
			}
		}

		if (rowDetails.length > 0) {
			details.push(...rowDetails);
			continue;
		}

		prepared.push({
			userId,
			type: row.type,
			amount: row.amount,
			currency,
			categoryId: row.categoryId,
			subcategoryId,
			description: row.description ?? '',
			date: row.date,
		});
	}

	if (details.length > 0) {
		throw new AppError(messages.TRANSACTION_IMPORT_FAILED, 422, details);
	}

	const inserted = await TransactionModel.insertMany(prepared, { ordered: true });
	const items = await Promise.all(inserted.map((txn) => toPublicTransaction(txn, userCurrency)));

	return {
		imported: items.length,
		items,
	};
}
