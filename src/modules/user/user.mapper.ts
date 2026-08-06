import type { UserDocument } from './user.model.js';

export type PublicUser = {
	id: string;
	name: string;
	email: string;
	currency: string;
	timezone: string;
	createdAt?: Date;
	updatedAt?: Date;
};

export function toPublicUser(
	user: Pick<UserDocument, 'name' | 'email' | 'currency' | 'timezone' | 'createdAt' | 'updatedAt'> & {
		_id: { toString(): string };
	},
): PublicUser {
	return {
		id: user._id.toString(),
		name: user.name,
		email: user.email,
		currency: user.currency,
		timezone: user.timezone,
		createdAt: user.createdAt,
		updatedAt: user.updatedAt,
	};
}
