import { z } from 'zod';

const passwordSchema = z
	.string()
	.min(8, 'Password must be at least 8 characters')
	.max(30, 'Password must be at most 30 characters')
	.regex(
		/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*\W).{8,30}$/,
		'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
	);

export const registerBodySchema = z.object({
	name: z.string().trim().min(3).max(30),
	email: z.string().trim().email().toLowerCase(),
	password: passwordSchema,
});

export const loginBodySchema = z.object({
	email: z.string().trim().email().toLowerCase(),
	password: z.string().min(1, 'Password is required'),
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
