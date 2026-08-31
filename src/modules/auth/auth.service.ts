import { UserRole } from '../../config/enums.js';
import { messages } from '../../config/messages.js';
import { AppError } from '../../shared/errors/AppError.js';
import { signAccessToken } from '../../shared/utils/jwt.js';
import { comparePassword, hashPassword } from '../../shared/utils/password.js';
import { seedDefaultCategories } from '../category/category.seed.js';
import { CurrencyModel } from '../currency/currency.model.js';
import { toPublicUser } from '../user/user.mapper.js';
import { UserModel } from '../user/user.model.js';
import type { LoginBody, RegisterBody } from './auth.validation.js';

async function assertEnabledCurrency(code: string): Promise<void> {
	const found = await CurrencyModel.findOne({ code, enabled: true }).lean();
	if (!found) {
		throw new AppError(messages.CURRENCY_INVALID, 422);
	}
}

export async function registerUser(input: RegisterBody) {
	await assertEnabledCurrency(input.currency);

	const existing = await UserModel.findOne({ email: input.email }).lean();
	if (existing) {
		throw new AppError(messages.USER_ALREADY_EXISTS, 409);
	}

	const passwordHash = await hashPassword(input.password);
	const user = await UserModel.create({
		name: input.name,
		email: input.email,
		password: passwordHash,
		role: UserRole.User,
		currency: input.currency,
		timezone: input.timezone || 'UTC',
		openingBalance: {
			amount: 0,
			currency: input.currency,
			setAt: null,
		},
		startingBalancePromptDismissedAt: null,
	});

	try {
		await seedDefaultCategories(user._id);
	} catch (err) {
		await UserModel.deleteOne({ _id: user._id });
		throw err;
	}

	const accessToken = signAccessToken({
		userId: user._id.toString(),
		email: user.email,
		name: user.name,
		role: user.role ?? UserRole.User,
	});

	return {
		user: toPublicUser(user),
		accessToken,
	};
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
		role: user.role ?? UserRole.User,
	});

	return {
		user: toPublicUser(user),
		accessToken,
	};
}
