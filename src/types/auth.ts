import type { UserRoleValue } from '../config/enums.js';

export type AccessTokenPayload = {
	userId: string;
	email: string;
	name: string;
	role: UserRoleValue;
};
