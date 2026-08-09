import { Schema, Types, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { CategoryKind } from '../../config/enums.js';

const categorySchema = new Schema(
	{
		userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
		name: { type: String, required: true, trim: true },
		parentCategoryId: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
		kind: {
			type: String,
			required: true,
			enum: Object.values(CategoryKind),
		},
	},
	{ timestamps: true },
);

categorySchema.index(
	{ userId: 1, kind: 1, parentCategoryId: 1, name: 1 },
	{ unique: true },
);
categorySchema.index({ userId: 1, kind: 1, parentCategoryId: 1 });

export type Category = InferSchemaType<typeof categorySchema>;
export type CategoryDocument = HydratedDocument<Category>;

export type CategoryId = Types.ObjectId;

export const CategoryModel = model<Category>('Category', categorySchema);
