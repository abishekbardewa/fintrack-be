import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { limits } from '../../config/limits.js';

const exchangeRateSchema = new Schema(
	{
		date: { type: String, required: true, unique: true, trim: true },
		base: { type: String, required: true, uppercase: true, default: limits.systemBaseCurrency },
		rates: { type: Map, of: Number, required: true },
		fetchedAt: { type: Date, required: true },
		source: { type: String, required: true, default: 'frankfurter' },
		attemptCount: { type: Number, default: 1, min: 1 },
	},
	{ timestamps: true },
);

export type ExchangeRate = InferSchemaType<typeof exchangeRateSchema>;
export type ExchangeRateDocument = HydratedDocument<ExchangeRate>;

export const ExchangeRateModel = model<ExchangeRate>('ExchangeRate', exchangeRateSchema);
