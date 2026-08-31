import { limits } from '../../config/limits.js';
import { messages } from '../../config/messages.js';
import { AppError } from '../../shared/errors/AppError.js';
import { deleteBlobByUrl, uploadBlob } from '../../shared/utils/blob.js';
import { toAvatarWebp } from '../../shared/utils/image.js';
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

async function assertEnabledCurrency(code: string): Promise<void> {
	const found = await CurrencyModel.findOne({ code, enabled: true }).lean();
	if (!found) {
		throw new AppError(messages.CURRENCY_INVALID, 422);
	}
}

export async function updateMe(userId: string, input: UpdateMeBody) {
	if (input.currency) {
		await assertEnabledCurrency(input.currency);
	}
	if (input.openingBalance) {
		await assertEnabledCurrency(input.openingBalance.currency);
	}

	const now = new Date();
	const user = await UserModel.findByIdAndUpdate(
		userId,
		{
			...(input.name !== undefined ? { name: input.name } : {}),
			...(input.currency !== undefined ? { currency: input.currency } : {}),
			...(input.openingBalance !== undefined
				? {
						openingBalance: {
							amount: input.openingBalance.amount,
							currency: input.openingBalance.currency,
							setAt: now,
						},
						startingBalancePromptDismissedAt: now,
					}
				: {}),
			...(input.startingBalancePromptDismissed
				? { startingBalancePromptDismissedAt: now }
				: {}),
		},
		{ new: true, runValidators: true },
	);

	if (!user) {
		throw new AppError(messages.USER_NOT_FOUND, 404);
	}

	return toPublicUser(user);
}

export async function updateAvatar(userId: string, file: Buffer) {
	const existing = await UserModel.findById(userId).select('avatarUrl').lean();
	if (!existing) {
		throw new AppError(messages.USER_NOT_FOUND, 404);
	}

	const previousUrl = existing.avatarUrl ?? null;
	const image = await toAvatarWebp(file);
	const pathname = `${limits.avatarBlobFolder}/${userId}.${image.extension}`;
	const uploadedUrl = await uploadBlob(pathname, image.buffer, image.contentType);

	const user = await UserModel.findByIdAndUpdate(
		userId,
		{ avatarUrl: uploadedUrl },
		{ new: true, runValidators: true },
	).catch(async (error: unknown) => {
		await deleteBlobByUrl(uploadedUrl);
		throw error;
	});

	if (!user) {
		await deleteBlobByUrl(uploadedUrl);
		throw new AppError(messages.USER_NOT_FOUND, 404);
	}

	if (previousUrl && previousUrl !== uploadedUrl) {
		await deleteBlobByUrl(previousUrl);
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
