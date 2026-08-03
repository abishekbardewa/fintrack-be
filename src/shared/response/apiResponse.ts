import type { Response } from 'express';

type SuccessArgs = {
	res: Response;
	statusCode?: number;
	message?: string;
	data?: unknown;
};

type ErrorArgs = {
	res: Response;
	statusCode?: number;
	message: string;
	details?: Array<{ field: string; message: string }>;
};

export function sendSuccess({ res, statusCode = 200, message = 'Success', data = null }: SuccessArgs): void {
	res.status(statusCode).json({
		success: true,
		statusCode,
		message,
		data,
	});
}

export function sendError({ res, statusCode = 500, message, details }: ErrorArgs): void {
	const body: {
		success: false;
		statusCode: number;
		message: string;
		details?: Array<{ field: string; message: string }>;
	} = {
		success: false,
		statusCode,
		message,
	};

	if (details?.length) {
		body.details = details;
	}

	res.status(statusCode).json(body);
}
