import { UserRole, type UserRoleValue } from '../../config/enums.js';
import type { UserDocument } from './user.model.js';

export type PublicUser = {
	id: string;
	name: string;
	email: string;
	role: UserRoleValue;
	currency: string;
	timezone: string;
	createdAt?: Date;
	updatedAt?: Date;
};

export function toPublicUser(
	user: Pick<UserDocument, 'name' | 'email' | 'currency' | 'timezone' | 'createdAt' | 'updatedAt'> & {
		_id: { toString(): string };
		role?: UserRoleValue | null;
	},
): PublicUser {
	return {
		id: user._id.toString(),
		name: user.name,
		email: user.email,
		role: user.role ?? UserRole.User,
		currency: user.currency,
		timezone: user.timezone,
		createdAt: user.createdAt,
		updatedAt: user.updatedAt,
	};
}
