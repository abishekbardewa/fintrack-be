import type { Types } from 'mongoose';
import { categorySeeds } from '../../config/categorySeeds.js';
import { CategoryKind } from '../../config/enums.js';
import { CategoryModel } from './category.model.js';

export async function seedDefaultCategories(userId: Types.ObjectId | string): Promise<void> {
	const docs = [
		...categorySeeds[CategoryKind.Expense].map((name) => ({
			userId,
			name,
			kind: CategoryKind.Expense,
			parentCategoryId: null,
		})),
		...categorySeeds[CategoryKind.Income].map((name) => ({
			userId,
			name,
			kind: CategoryKind.Income,
			parentCategoryId: null,
		})),
	];

	await CategoryModel.insertMany(docs);
}
