import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const categorySchema = new Schema(
	{
		name: { type: String, required: true, trim: true },
		createdAt: { type: Date, default: Date.now },
	},
	{ _id: false },
);

const userSchema = new Schema(
	{
		name: { type: String, required: true, trim: true, minlength: 3, maxlength: 30 },
		email: {
			type: String,
			required: true,
			unique: true,
			lowercase: true,
			trim: true,
			index: true,
		},
		password: { type: String, required: true, select: false },
		categories: { type: [categorySchema], default: [] },
	},
	{ timestamps: true },
);

export type User = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<User>;

export const UserModel = model<User>('User', userSchema);
