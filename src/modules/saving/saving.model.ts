import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const savingSchema = new Schema(
	{
		userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
		name: { type: String, required: true, trim: true },
		currency: { type: String, required: true, uppercase: true, trim: true },
		currentAmount: { type: Number, required: true, min: 0, default: 0 },
		notes: { type: String, trim: true, default: null },
		kind: { type: String },
	},
	{ timestamps: true },
);

savingSchema.index({ userId: 1, createdAt: -1 });

export type Saving = InferSchemaType<typeof savingSchema>;
export type SavingDocument = HydratedDocument<Saving>;

export const SavingModel = model<Saving>('Saving', savingSchema);
