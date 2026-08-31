import { z } from 'zod';
import { currencyCodes } from '../../config/currencySeeds.js';
import { passwordSchema } from '../auth/auth.validation.js';

const currencyCodeSchema = z
	.string()
	.trim()
	.toUpperCase()
	.refine((code): code is (typeof currencyCodes)[number] => (currencyCodes as readonly string[]).includes(code), {
		message: 'Currency is not supported',
	});

export const updateMeBodySchema = z
	.object({
		name: z.string().trim().min(3).max(30).optional(),
		currency: currencyCodeSchema.optional(),
		openingBalance: z
			.object({
				amount: z.number().nonnegative(),
				currency: currencyCodeSchema,
			})
			.optional(),
		startingBalancePromptDismissed: z.literal(true).optional(),
	})
	.refine(
		(body) =>
			body.name !== undefined ||
			body.currency !== undefined ||
			body.openingBalance !== undefined ||
			body.startingBalancePromptDismissed !== undefined,
		{
			message: 'At least one field is required',
		},
	);

export const changePasswordBodySchema = z
	.object({
		currentPassword: z.string().min(1, 'Current password is required'),
		newPassword: passwordSchema,
	})
	.refine((body) => body.currentPassword !== body.newPassword, {
		message: 'New password must be different from the current password',
		path: ['newPassword'],
	});

export type UpdateMeBody = z.infer<typeof updateMeBodySchema>;
export type ChangePasswordBody = z.infer<typeof changePasswordBodySchema>;
