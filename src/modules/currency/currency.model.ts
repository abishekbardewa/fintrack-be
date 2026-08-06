import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const currencySchema = new Schema(
	{
		code: { type: String, required: true, unique: true, uppercase: true, trim: true },
		name: { type: String, required: true, trim: true },
		symbol: { type: String, required: true, trim: true },
		decimals: { type: Number, required: true, min: 0, max: 6 },
		enabled: { type: Boolean, default: true },
		sortOrder: { type: Number, default: 100 },
	},
	{ timestamps: true, collection: 'currencies' },
);

currencySchema.index({ enabled: 1, sortOrder: 1 });

export type Currency = InferSchemaType<typeof currencySchema>;
export type CurrencyDocument = HydratedDocument<Currency>;

export const CurrencyModel = model<Currency>('Currency', currencySchema);
