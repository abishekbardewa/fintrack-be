import { limits } from '../../config/limits.js';
import { messages } from '../../config/messages.js';
import { AppError } from '../../shared/errors/AppError.js';
import { CategoryModel } from '../category/category.model.js';
import { CurrencyModel } from '../currency/currency.model.js';
import { UserModel } from '../user/user.model.js';
import { toPublicTransaction } from './transaction.mapper.js';
import { TransactionModel } from './transaction.model.js';
import type {
	CreateTransactionBody,
	ListTransactionsQuery,
	SuggestDescriptionsQuery,
	UpdateTransactionBody,
} from './transaction.validation.js';

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

async function assertCategoryForTransaction(
	userId: string,
	type: string,
	categoryId: string,
	subcategoryId: string | null | undefined,
): Promise<void> {
	const main = await CategoryModel.findOne({ _id: categoryId, userId });
	if (!main || main.parentCategoryId !== null) {
		throw new AppError(messages.TRANSACTION_CATEGORY_INVALID, 404);
	}
	if (main.kind !== type) {
		throw new AppError(messages.TRANSACTION_CATEGORY_INVALID, 422);
	}

	if (subcategoryId) {
		const sub = await CategoryModel.findOne({ _id: subcategoryId, userId });
		if (!sub || !sub.parentCategoryId || sub.parentCategoryId.toString() !== categoryId) {
			throw new AppError(messages.TRANSACTION_CATEGORY_INVALID, 404);
		}
		if (sub.kind !== type) {
			throw new AppError(messages.TRANSACTION_CATEGORY_INVALID, 422);
		}
	}
}

function escapeRegex(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function createTransaction(userId: string, input: CreateTransactionBody) {
	const userCurrency = await getUserCurrency(userId);
	const currency = input.currency ?? userCurrency;
	await assertEnabledCurrency(currency);
	await assertCategoryForTransaction(userId, input.type, input.categoryId, input.subcategoryId);

	const txn = await TransactionModel.create({
		userId,
		type: input.type,
		amount: input.amount,
		currency,
		categoryId: input.categoryId,
		subcategoryId: input.subcategoryId ?? null,
		description: input.description ?? '',
		date: input.date,
	});

	return toPublicTransaction(txn, userCurrency);
}

export async function listTransactions(userId: string, query: ListTransactionsQuery) {
	const userCurrency = await getUserCurrency(userId);
	const filter: Record<string, unknown> = { userId };

	if (query.type) filter.type = query.type;
	if (query.categoryId) filter.categoryId = query.categoryId;
	if (query.subcategoryId) filter.subcategoryId = query.subcategoryId;
	if (query.currency) filter.currency = query.currency;

	if (query.from || query.to) {
		filter.date = {
			...(query.from ? { $gte: query.from } : {}),
			...(query.to ? { $lte: query.to } : {}),
		};
	}

	if (query.minAmount !== undefined || query.maxAmount !== undefined) {
		filter.amount = {
			...(query.minAmount !== undefined ? { $gte: query.minAmount } : {}),
			...(query.maxAmount !== undefined ? { $lte: query.maxAmount } : {}),
		};
	}

	if (query.q) {
		filter.description = { $regex: escapeRegex(query.q), $options: 'i' };
	}

	const page = query.page;
	const limit = query.limit;
	const skip = (page - 1) * limit;

	const [items, total] = await Promise.all([
		TransactionModel.find(filter).sort({ date: -1, createdAt: -1 }).skip(skip).limit(limit),
		TransactionModel.countDocuments(filter),
	]);

	return {
		items: await Promise.all(items.map((txn) => toPublicTransaction(txn, userCurrency))),
		page,
		limit,
		total,
		totalPages: Math.ceil(total / limit) || 0,
	};
}

export async function getTransaction(userId: string, transactionId: string) {
	const userCurrency = await getUserCurrency(userId);
	const txn = await TransactionModel.findOne({ _id: transactionId, userId });
	if (!txn) {
		throw new AppError(messages.TRANSACTION_NOT_FOUND, 404);
	}
	return toPublicTransaction(txn, userCurrency);
}

export async function updateTransaction(userId: string, transactionId: string, input: UpdateTransactionBody) {
	const existing = await TransactionModel.findOne({ _id: transactionId, userId });
	if (!existing) {
		throw new AppError(messages.TRANSACTION_NOT_FOUND, 404);
	}

	const nextType = input.type ?? existing.type;
	const nextCategoryId = input.categoryId ?? existing.categoryId.toString();
	const nextSubcategoryId =
		input.subcategoryId !== undefined
			? input.subcategoryId
			: existing.subcategoryId
				? existing.subcategoryId.toString()
				: null;

	if (input.currency) {
		await assertEnabledCurrency(input.currency);
	}

	if (input.type || input.categoryId || input.subcategoryId !== undefined) {
		await assertCategoryForTransaction(userId, nextType, nextCategoryId, nextSubcategoryId);
	}

	const patch: Record<string, unknown> = {};
	if (input.type !== undefined) patch.type = input.type;
	if (input.amount !== undefined) patch.amount = input.amount;
	if (input.currency !== undefined) patch.currency = input.currency;
	if (input.categoryId !== undefined) patch.categoryId = input.categoryId;
	if (input.subcategoryId !== undefined) patch.subcategoryId = input.subcategoryId ?? null;
	if (input.description !== undefined) patch.description = input.description;
	if (input.date !== undefined) patch.date = input.date;

	const updated = await TransactionModel.findOneAndUpdate(
		{ _id: transactionId, userId },
		{ $set: patch },
		{ new: true, runValidators: true },
	);
	if (!updated) {
		throw new AppError(messages.TRANSACTION_NOT_FOUND, 404);
	}

	const userCurrency = await getUserCurrency(userId);
	return toPublicTransaction(updated, userCurrency);
}

export async function deleteTransaction(userId: string, transactionId: string) {
	const result = await TransactionModel.deleteOne({ _id: transactionId, userId });
	if (result.deletedCount === 0) {
		throw new AppError(messages.TRANSACTION_NOT_FOUND, 404);
	}
}

export async function suggestDescriptions(userId: string, query: SuggestDescriptionsQuery) {
	const filter: Record<string, unknown> = {
		userId,
		categoryId: query.categoryId,
		description: { $nin: [null, ''] },
	};
	if (query.subcategoryId) {
		filter.subcategoryId = query.subcategoryId;
	} else {
		filter.subcategoryId = null;
	}
	if (query.type) {
		filter.type = query.type;
	}

	const rows = await TransactionModel.find(filter)
		.select('description date')
		.sort({ date: -1 })
		.limit(50)
		.lean();

	const seen = new Set<string>();
	const descriptions: string[] = [];

	for (const row of rows) {
		const raw = (row.description ?? '').trim();
		if (!raw) continue;
		const key = raw.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		descriptions.push(raw);
		if (descriptions.length >= limits.suggestDescriptionsLimit) break;
	}

	if (descriptions.length === 0 && query.subcategoryId) {
		return suggestDescriptions(userId, {
			categoryId: query.categoryId,
			type: query.type,
		});
	}

	return descriptions;
}
