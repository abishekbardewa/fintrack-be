import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { FxSyncLogType } from '../../config/enums.js';

const fxSyncLogSchema = new Schema(
	{
		type: {
			type: String,
			required: true,
			enum: Object.values(FxSyncLogType),
			index: true,
		},
		date: { type: String, trim: true, default: null, index: true },
		success: { type: Boolean, required: true },
		error: { type: String, trim: true, default: null },
		triggeredBy: { type: String, required: true, trim: true },
		startedAt: { type: Date, required: true },
		finishedAt: { type: Date, required: true },
	},
	{ timestamps: true },
);

fxSyncLogSchema.index({ createdAt: -1 });

export type FxSyncLog = InferSchemaType<typeof fxSyncLogSchema>;
export type FxSyncLogDocument = HydratedDocument<FxSyncLog>;

export const FxSyncLogModel = model<FxSyncLog>('FxSyncLog', fxSyncLogSchema);
