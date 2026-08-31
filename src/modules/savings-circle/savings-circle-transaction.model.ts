import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { SavingsCircleTransactionSource } from '../../config/enums.js';

const savingsCircleTransactionSchema = new Schema(
	{
		circleId: { type: Schema.Types.ObjectId, ref: 'SavingsCircle', required: true, index: true },
		userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
		amount: { type: Number, required: true },
		currency: { type: String, required: true, uppercase: true, trim: true },
		date: { type: Date, required: true },
		note: { type: String, trim: true, default: null },
		source: {
			type: String,
			required: true,
			enum: Object.values(SavingsCircleTransactionSource),
		},
	},
	{ timestamps: true },
);

savingsCircleTransactionSchema.index({ circleId: 1, date: -1 });
savingsCircleTransactionSchema.index({ userId: 1, date: -1 });

export type SavingsCircleTransaction = InferSchemaType<typeof savingsCircleTransactionSchema>;
export type SavingsCircleTransactionDocument = HydratedDocument<SavingsCircleTransaction>;

export const SavingsCircleTransactionModel = model<SavingsCircleTransaction>(
	'SavingsCircleTransaction',
	savingsCircleTransactionSchema,
);
