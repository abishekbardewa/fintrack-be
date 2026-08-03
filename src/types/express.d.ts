import type { AccessTokenPayload } from './auth.js';

declare global {
	namespace Express {
		interface Request {
			user?: AccessTokenPayload;
		}
	}
}

export {};
