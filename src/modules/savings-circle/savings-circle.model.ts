import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { SavingCircleFrequency, SavingCircleStatus } from '../../config/enums.js';

const savingsCircleSchema = new Schema(
	{
		userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
		name: { type: String, required: true, trim: true },
		currency: { type: String, required: true, uppercase: true, trim: true },
		notes: { type: String, trim: true, default: null },
		status: {
			type: String,
			required: true,
			enum: Object.values(SavingCircleStatus),
			default: SavingCircleStatus.Active,
		},
		contributionAmount: { type: Number, required: true, min: 0 },
		frequency: {
			type: String,
			required: true,
			enum: Object.values(SavingCircleFrequency),
		},
		memberCount: { type: Number, required: true, min: 2 },
		startDate: { type: Date, required: true },
		expectedPayout: { type: Number, required: true, min: 0 },
	},
	{ timestamps: true },
);

savingsCircleSchema.index({ userId: 1, createdAt: -1 });
savingsCircleSchema.index({ userId: 1, status: 1 });

export type SavingsCircle = InferSchemaType<typeof savingsCircleSchema>;
export type SavingsCircleDocument = HydratedDocument<SavingsCircle>;

export const SavingsCircleModel = model<SavingsCircle>('SavingsCircle', savingsCircleSchema);
