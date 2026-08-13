import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { ExchangeRateProcess, ExchangeRateSource, ExchangeRateStatus } from '../../config/enums.js';
import { limits } from '../../config/limits.js';

const lastErrorSchema = new Schema(
	{
		message: { type: String, required: true, trim: true },
		at: { type: Date, required: true },
	},
	{ _id: false },
);

const exchangeRateSchema = new Schema(
	{
		date: { type: String, required: true, unique: true, trim: true },
		base: { type: String, required: true, uppercase: true, default: limits.systemBaseCurrency },
		rates: { type: Map, of: Number, required: true },
		fetchedAt: { type: Date, required: true },
		source: {
			type: String,
			required: true,
			enum: Object.values(ExchangeRateSource),
			default: ExchangeRateSource.Frankfurter,
		},
		status: {
			type: String,
			required: true,
			enum: Object.values(ExchangeRateStatus),
			default: ExchangeRateStatus.Ok,
			index: true,
		},
		process: {
			type: String,
			required: true,
			enum: Object.values(ExchangeRateProcess),
			index: true,
		},
		triggeredBy: { type: String, required: true, trim: true },
		attemptCount: { type: Number, default: 1, min: 1 },
		lastError: { type: lastErrorSchema, default: null },
		notes: { type: String, trim: true, default: null },
		updatedBy: { type: String, trim: true, default: null },
	},
	{ timestamps: true },
);

export type ExchangeRate = InferSchemaType<typeof exchangeRateSchema>;
export type ExchangeRateDocument = HydratedDocument<ExchangeRate>;

export const ExchangeRateModel = model<ExchangeRate>('ExchangeRate', exchangeRateSchema);
