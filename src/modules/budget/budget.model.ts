import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { BudgetPeriodType } from '../../config/enums.js';

const budgetSchema = new Schema(
	{
		userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
		periodType: {
			type: String,
			required: true,
			enum: Object.values(BudgetPeriodType),
		},
		categoryId: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
		year: { type: Number, default: null },
		month: { type: Number, default: null, min: 1, max: 12 },
		weekStart: { type: Date, default: null },
		effectiveFrom: { type: Date, required: true },
		effectiveTo: { type: Date, required: true },
		limitAmount: { type: Number, required: true, min: 0 },
		currency: { type: String, required: true, uppercase: true, trim: true },
	},
	{ timestamps: true },
);

budgetSchema.index(
	{ userId: 1, year: 1, month: 1, categoryId: 1 },
	{ unique: true, partialFilterExpression: { periodType: BudgetPeriodType.Month } },
);
budgetSchema.index(
	{ userId: 1, weekStart: 1, categoryId: 1 },
	{ unique: true, partialFilterExpression: { periodType: BudgetPeriodType.Week } },
);
budgetSchema.index({ userId: 1, periodType: 1, year: 1, month: 1 });
budgetSchema.index({ userId: 1, weekStart: 1 });

export type Budget = InferSchemaType<typeof budgetSchema>;
export type BudgetDocument = HydratedDocument<Budget>;

export const BudgetModel = model<Budget>('Budget', budgetSchema);
