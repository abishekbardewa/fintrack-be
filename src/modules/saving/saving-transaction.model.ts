import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { SavingTransactionSource } from '../../config/enums.js';

const savingTransactionSchema = new Schema(
	{
		savingId: { type: Schema.Types.ObjectId, ref: 'Saving', required: true, index: true },
		userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
		amount: { type: Number, required: true },
		currency: { type: String, required: true, uppercase: true, trim: true },
		date: { type: Date, required: true },
		note: { type: String, trim: true, default: null },
		source: {
			type: String,
			required: true,
			enum: Object.values(SavingTransactionSource),
		},
	},
	{ timestamps: true },
);

savingTransactionSchema.index({ savingId: 1, date: -1 });
savingTransactionSchema.index({ userId: 1, date: -1 });

export type SavingTransaction = InferSchemaType<typeof savingTransactionSchema>;
export type SavingTransactionDocument = HydratedDocument<SavingTransaction>;

export const SavingTransactionModel = model<SavingTransaction>(
	'SavingTransaction',
	savingTransactionSchema,
);
