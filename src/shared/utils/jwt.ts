import jwt from 'jsonwebtoken';
import { config } from '../../config/env.js';
import type { AccessTokenPayload } from '../../types/auth.js';

export function signAccessToken(payload: AccessTokenPayload): string {
	return jwt.sign(payload, config.jwt.secret, {
		expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
	});
}
