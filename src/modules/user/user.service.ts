import { messages } from '../../config/messages.js';
import { AppError } from '../../shared/errors/AppError.js';
import { comparePassword, hashPassword } from '../../shared/utils/password.js';
import { CurrencyModel } from '../currency/currency.model.js';
import { toPublicUser } from './user.mapper.js';
import { UserModel } from './user.model.js';
import type { ChangePasswordBody, UpdateMeBody } from './user.validation.js';

export async function getMe(userId: string) {
	const user = await UserModel.findById(userId);
	if (!user) {
		throw new AppError(messages.USER_NOT_FOUND, 404);
	}
	return toPublicUser(user);
}

export async function updateMe(userId: string, input: UpdateMeBody) {
	if (input.currency) {
		const found = await CurrencyModel.findOne({ code: input.currency, enabled: true }).lean();
		if (!found) {
			throw new AppError(messages.CURRENCY_INVALID, 422);
		}
	}

	const user = await UserModel.findByIdAndUpdate(
		userId,
		{
			...(input.name !== undefined ? { name: input.name } : {}),
			...(input.currency !== undefined ? { currency: input.currency } : {}),
		},
		{ new: true, runValidators: true },
	);

	if (!user) {
		throw new AppError(messages.USER_NOT_FOUND, 404);
	}

	return toPublicUser(user);
}

export async function changePassword(userId: string, input: ChangePasswordBody) {
	const user = await UserModel.findById(userId).select('+password');
	if (!user?.password) {
		throw new AppError(messages.USER_NOT_FOUND, 404);
	}

	const valid = await comparePassword(input.currentPassword, user.password);
	if (!valid) {
		throw new AppError(messages.PASSWORD_CHANGE_FAILED, 401);
	}

	user.password = await hashPassword(input.newPassword);
	await user.save();
}
