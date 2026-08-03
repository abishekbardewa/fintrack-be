import { messages } from '../../config/messages.js';
import { AppError } from '../../shared/errors/AppError.js';
import { PREDEFINED_CATEGORIES } from '../../shared/utils/constants.js';
import { signAccessToken } from '../../shared/utils/jwt.js';
import { comparePassword, hashPassword } from '../../shared/utils/password.js';
import { UserModel } from '../user/user.model.js';
import type { LoginBody, RegisterBody } from './auth.validation.js';

function toPublicUser(user: { _id: { toString(): string }; name: string; email: string; categories?: unknown; createdAt?: Date; updatedAt?: Date }) {
	return {
		id: user._id.toString(),
		name: user.name,
		email: user.email,
		categories: user.categories ?? [],
		createdAt: user.createdAt,
		updatedAt: user.updatedAt,
	};
}

export async function registerUser(input: RegisterBody) {
	const existing = await UserModel.findOne({ email: input.email }).lean();
	if (existing) {
		throw new AppError(messages.USER_ALREADY_EXISTS, 409);
	}

	const passwordHash = await hashPassword(input.password);
	const user = await UserModel.create({
		name: input.name,
		email: input.email,
		password: passwordHash,
		categories: [...PREDEFINED_CATEGORIES],
	});

	return toPublicUser(user);
}

export async function loginUser(input: LoginBody) {
	const user = await UserModel.findOne({ email: input.email }).select('+password');
	if (!user?.password) {
		throw new AppError(messages.LOGIN_FAILED, 401);
	}

	const valid = await comparePassword(input.password, user.password);
	if (!valid) {
		throw new AppError(messages.LOGIN_FAILED, 401);
	}

	const accessToken = signAccessToken({
		userId: user._id.toString(),
		email: user.email,
		name: user.name,
	});

	return {
		user: toPublicUser(user),
		accessToken,
	};
}
