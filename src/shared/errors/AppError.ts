export class AppError extends Error {
	readonly statusCode: number;
	readonly isOperational: boolean;
	readonly details?: Array<{ field: string; message: string }>;

	constructor(message: string, statusCode: number, details?: Array<{ field: string; message: string }>) {
		super(message);
		this.statusCode = statusCode;
		this.isOperational = true;
		this.details = details;
		Object.setPrototypeOf(this, new.target.prototype);
		Error.captureStackTrace?.(this, this.constructor);
	}
}
