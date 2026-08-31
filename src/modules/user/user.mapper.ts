import { UserRole, type UserRoleValue } from '../../config/enums.js';
import type { UserDocument } from './user.model.js';

export type PublicOpeningBalance = {
	amount: number;
	currency: string;
	setAt: Date | null;
};

export type PublicUser = {
	id: string;
	name: string;
	email: string;
	role: UserRoleValue;
	currency: string;
	timezone: string;
	avatarUrl: string | null;
	openingBalance: PublicOpeningBalance;
	startingBalance: PublicOpeningBalance;
	startingBalancePromptDismissedAt: Date | null;
	createdAt?: Date;
	updatedAt?: Date;
};

type UserOpeningSource = {
	currency: string;
	openingBalance?: {
		amount?: number | null;
		currency?: string | null;
		setAt?: Date | null;
	} | null;
};

export function resolveOpeningBalance(user: UserOpeningSource): PublicOpeningBalance {
	const stored = user.openingBalance;
	if (!stored) {
		return { amount: 0, currency: user.currency, setAt: null };
	}
	return {
		amount: stored.amount ?? 0,
		currency: stored.currency || user.currency,
		setAt: stored.setAt ?? null,
	};
}

export function toPublicUser(
	user: Pick<
		UserDocument,
		'name' | 'email' | 'currency' | 'timezone' | 'avatarUrl' | 'createdAt' | 'updatedAt'
	> & {
		_id: { toString(): string };
		role?: UserRoleValue | null;
		openingBalance?: UserDocument['openingBalance'];
		startingBalancePromptDismissedAt?: Date | null;
	},
): PublicUser {
	const openingBalance = resolveOpeningBalance(user);
	return {
		id: user._id.toString(),
		name: user.name,
		email: user.email,
		role: user.role ?? UserRole.User,
		currency: user.currency,
		timezone: user.timezone,
		avatarUrl: user.avatarUrl ?? null,
		openingBalance,
		startingBalance: openingBalance,
		startingBalancePromptDismissedAt: user.startingBalancePromptDismissedAt ?? null,
		createdAt: user.createdAt,
		updatedAt: user.updatedAt,
	};
}
