import { z } from 'zod';
import { currencyCodes } from '../../config/currencySeeds.js';
import { limits } from '../../config/limits.js';

export const passwordSchema = z
	.string()
	.min(8, 'Password must be at least 8 characters')
	.max(30, 'Password must be at most 30 characters')
	.regex(
		/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*\W).{8,30}$/,
		'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
	);

const timezoneSchema = z
	.string()
	.trim()
	.min(1)
	.max(64)
	.default(limits.defaultTimezone);

export const registerBodySchema = z.object({
	name: z.string().trim().min(3).max(30),
	email: z.string().trim().email().toLowerCase(),
	password: passwordSchema,
	currency: z
		.string()
		.trim()
		.toUpperCase()
		.refine((code): code is (typeof currencyCodes)[number] => (currencyCodes as readonly string[]).includes(code), {
			message: 'Currency is not supported',
		}),
	timezone: timezoneSchema,
});

export const loginBodySchema = z.object({
	email: z.string().trim().email().toLowerCase(),
	password: z.string().min(1, 'Password is required'),
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
