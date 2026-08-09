import { limits } from '../../config/limits.js';
import { messages } from '../../config/messages.js';
import { AppError } from '../../shared/errors/AppError.js';
import { TransactionModel } from '../transaction/transaction.model.js';
import { toPublicCategory } from './category.mapper.js';
import { CategoryModel } from './category.model.js';
import type { CreateCategoryBody, ListCategoriesQuery, UpdateCategoryBody } from './category.validation.js';

function isDuplicateKeyError(err: unknown): boolean {
	return typeof err === 'object' && err !== null && 'code' in err && (err as { code?: number }).code === 11000;
}

async function isUsedByTransactions(userId: string, categoryId: string): Promise<boolean> {
	const count = await TransactionModel.countDocuments({
		userId,
		$or: [{ categoryId }, { subcategoryId: categoryId }],
	});
	return count > 0;
}

export async function listCategories(userId: string, query: ListCategoriesQuery) {
	const filter: Record<string, unknown> = { userId };
	if (query.kind) {
		filter.kind = query.kind;
	}

	const categories = await CategoryModel.find(filter).sort({ kind: 1, parentCategoryId: 1, name: 1 });
	return categories.map(toPublicCategory);
}

export async function createCategory(userId: string, input: CreateCategoryBody) {
	const parentId = input.parentCategoryId ?? null;

	if (parentId) {
		const parent = await CategoryModel.findOne({ _id: parentId, userId });
		if (!parent || parent.parentCategoryId !== null) {
			throw new AppError(messages.CATEGORY_PARENT_INVALID, 404);
		}
		if (parent.kind !== input.kind) {
			throw new AppError(messages.CATEGORY_PARENT_INVALID, 422);
		}

		const subCount = await CategoryModel.countDocuments({ userId, parentCategoryId: parentId });
		if (subCount >= limits.maxSubcategoriesPerParent) {
			throw new AppError(messages.CATEGORY_SUB_CAP, 422);
		}
	} else {
		const mainCount = await CategoryModel.countDocuments({
			userId,
			kind: input.kind,
			parentCategoryId: null,
		});
		if (mainCount >= limits.maxMainCategoriesPerKind) {
			throw new AppError(messages.CATEGORY_MAIN_CAP, 422);
		}
	}

	try {
		const category = await CategoryModel.create({
			userId,
			name: input.name,
			kind: input.kind,
			parentCategoryId: parentId,
		});
		return toPublicCategory(category);
	} catch (err) {
		if (isDuplicateKeyError(err)) {
			throw new AppError(messages.VALIDATION_FAILED, 409, [
				{ field: 'name', message: 'Category name already exists for this parent' },
			]);
		}
		throw err;
	}
}

export async function updateCategory(userId: string, categoryId: string, input: UpdateCategoryBody) {
	try {
		const category = await CategoryModel.findOneAndUpdate(
			{ _id: categoryId, userId },
			{ name: input.name },
			{ new: true, runValidators: true },
		);
		if (!category) {
			throw new AppError(messages.CATEGORY_NOT_FOUND, 404);
		}
		return toPublicCategory(category);
	} catch (err) {
		if (err instanceof AppError) {
			throw err;
		}
		if (isDuplicateKeyError(err)) {
			throw new AppError(messages.VALIDATION_FAILED, 409, [
				{ field: 'name', message: 'Category name already exists for this parent' },
			]);
		}
		throw err;
	}
}

export async function deleteCategory(userId: string, categoryId: string) {
	const category = await CategoryModel.findOne({ _id: categoryId, userId });
	if (!category) {
		throw new AppError(messages.CATEGORY_NOT_FOUND, 404);
	}

	if (category.parentCategoryId === null) {
		const childCount = await CategoryModel.countDocuments({ userId, parentCategoryId: category._id });
		if (childCount > 0) {
			throw new AppError(messages.CATEGORY_HAS_CHILDREN, 422);
		}
	}

	if (await isUsedByTransactions(userId, categoryId)) {
		throw new AppError(messages.CATEGORY_IN_USE, 422);
	}

	await CategoryModel.deleteOne({ _id: categoryId, userId });
}
