import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { SavingsContributionSource } from '../../config/enums.js';

const savingsGoalContributionSchema = new Schema(
	{
		goalId: { type: Schema.Types.ObjectId, ref: 'SavingsGoal', required: true, index: true },
		userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
		amount: { type: Number, required: true },
		currency: { type: String, required: true, uppercase: true, trim: true },
		date: { type: Date, required: true },
		note: { type: String, trim: true, default: null },
		source: {
			type: String,
			required: true,
			enum: Object.values(SavingsContributionSource),
			default: SavingsContributionSource.Manual,
		},
		transactionId: { type: Schema.Types.ObjectId, ref: 'Transaction', default: null },
	},
	{ timestamps: true },
);

savingsGoalContributionSchema.index({ goalId: 1, date: -1 });
savingsGoalContributionSchema.index({ userId: 1, date: -1 });

export type SavingsGoalContribution = InferSchemaType<typeof savingsGoalContributionSchema>;
export type SavingsGoalContributionDocument = HydratedDocument<SavingsGoalContribution>;

export const SavingsGoalContributionModel = model<SavingsGoalContribution>(
	'SavingsGoalContribution',
	savingsGoalContributionSchema,
);
