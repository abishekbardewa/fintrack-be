import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { TransactionType } from '../../config/enums.js';

const transactionSchema = new Schema(
	{
		userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
		type: {
			type: String,
			required: true,
			enum: Object.values(TransactionType),
		},
		amount: { type: Number, required: true, min: 0 },
		currency: { type: String, required: true, uppercase: true, trim: true },
		categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
		subcategoryId: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
		description: { type: String, trim: true, default: '' },
		date: { type: Date, required: true },
	},
	{ timestamps: true },
);

transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, type: 1, date: -1 });
transactionSchema.index({ userId: 1, categoryId: 1, date: -1 });
transactionSchema.index({ description: 'text' });

export type Transaction = InferSchemaType<typeof transactionSchema>;
export type TransactionDocument = HydratedDocument<Transaction>;

export const TransactionModel = model<Transaction>('Transaction', transactionSchema);
