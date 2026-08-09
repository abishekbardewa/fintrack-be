import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { SavingsGoalStatus } from '../../config/enums.js';

const savingsGoalSchema = new Schema(
	{
		userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
		name: { type: String, required: true, trim: true },
		targetAmount: { type: Number, required: true, min: 0 },
		currency: { type: String, required: true, uppercase: true, trim: true },
		currentAmount: { type: Number, required: true, min: 0, default: 0 },
		targetDate: { type: Date, default: null },
		status: {
			type: String,
			required: true,
			enum: Object.values(SavingsGoalStatus),
			default: SavingsGoalStatus.Active,
		},
	},
	{ timestamps: true },
);

savingsGoalSchema.index({ userId: 1, status: 1 });
savingsGoalSchema.index({ userId: 1, createdAt: -1 });

export type SavingsGoal = InferSchemaType<typeof savingsGoalSchema>;
export type SavingsGoalDocument = HydratedDocument<SavingsGoal>;

export const SavingsGoalModel = model<SavingsGoal>('SavingsGoal', savingsGoalSchema);
