import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { InvestmentTransactionSource } from '../../config/enums.js';

const investmentTransactionSchema = new Schema(
	{
		investmentId: { type: Schema.Types.ObjectId, ref: 'Investment', required: true, index: true },
		userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
		amount: { type: Number, required: true },
		currency: { type: String, required: true, uppercase: true, trim: true },
		date: { type: Date, required: true },
		note: { type: String, trim: true, default: null },
		source: {
			type: String,
			required: true,
			enum: Object.values(InvestmentTransactionSource),
		},
	},
	{ timestamps: true },
);

investmentTransactionSchema.index({ investmentId: 1, date: -1 });
investmentTransactionSchema.index({ userId: 1, date: -1 });

export type InvestmentTransaction = InferSchemaType<typeof investmentTransactionSchema>;
export type InvestmentTransactionDocument = HydratedDocument<InvestmentTransaction>;

export const InvestmentTransactionModel = model<InvestmentTransaction>(
	'InvestmentTransaction',
	investmentTransactionSchema,
);
