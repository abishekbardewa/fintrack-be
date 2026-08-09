import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { UserRole } from '../../config/enums.js';
import { limits } from '../../config/limits.js';

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
		role: {
			type: String,
			required: true,
			enum: Object.values(UserRole),
			default: UserRole.User,
			index: true,
		},
		currency: {
			type: String,
			required: true,
			uppercase: true,
			trim: true,
		},
		timezone: {
			type: String,
			required: true,
			trim: true,
			default: limits.defaultTimezone,
		},
	},
	{ timestamps: true },
);

export type User = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<User>;

export const UserModel = model<User>('User', userSchema);
