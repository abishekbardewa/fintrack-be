import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { InvestmentStatus } from '../../config/enums.js';

const investmentSchema = new Schema(
	{
		userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
		name: { type: String, required: true, trim: true },
		currency: { type: String, required: true, uppercase: true, trim: true },
		initialAmount: { type: Number, required: true, min: 0, default: 0 },
		currentBalance: { type: Number, required: true, min: 0, default: 0 },
		startDate: { type: Date, default: null },
		closedAmount: { type: Number, required: true, min: 0, default: 0 },
		notes: { type: String, trim: true, default: null },
		status: {
			type: String,
			required: true,
			enum: Object.values(InvestmentStatus),
			default: InvestmentStatus.Active,
		},
	},
	{ timestamps: true },
);

investmentSchema.index({ userId: 1, createdAt: -1 });
investmentSchema.index({ userId: 1, status: 1 });

export type Investment = InferSchemaType<typeof investmentSchema>;
export type InvestmentDocument = HydratedDocument<Investment>;

export const InvestmentModel = model<Investment>('Investment', investmentSchema);
