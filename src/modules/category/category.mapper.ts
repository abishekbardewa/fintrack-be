import type { Types } from 'mongoose';
import type { CategoryDocument } from './category.model.js';

export type PublicCategory = {
	id: string;
	name: string;
	kind: string;
	parentCategoryId: string | null;
	createdAt?: Date;
	updatedAt?: Date;
};

export function toPublicCategory(
	category: Pick<CategoryDocument, 'name' | 'kind' | 'parentCategoryId' | 'createdAt' | 'updatedAt'> & {
		_id: Types.ObjectId;
	},
): PublicCategory {
	return {
		id: category._id.toString(),
		name: category.name,
		kind: category.kind,
		parentCategoryId: category.parentCategoryId ? category.parentCategoryId.toString() : null,
		createdAt: category.createdAt,
		updatedAt: category.updatedAt,
	};
}
