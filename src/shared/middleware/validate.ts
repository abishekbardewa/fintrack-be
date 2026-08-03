import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';
import { ZodError } from 'zod';
import { messages } from '../../config/messages.js';
import { AppError } from '../errors/AppError.js';

type Schemas = {
	body?: ZodTypeAny;
	query?: ZodTypeAny;
	params?: ZodTypeAny;
};

export const validate = (schemas: Schemas) => {
	return (req: Request, _res: Response, next: NextFunction): void => {
		try {
			if (schemas.body) {
				req.body = schemas.body.parse(req.body);
			}
			if (schemas.query) {
				req.query = schemas.query.parse(req.query) as Request['query'];
			}
			if (schemas.params) {
				req.params = schemas.params.parse(req.params) as Request['params'];
			}
			next();
		} catch (error) {
			if (error instanceof ZodError) {
				next(
					new AppError(
						messages.VALIDATION_FAILED,
						422,
						error.issues.map((issue) => ({
							field: issue.path.join('.') || 'unknown',
							message: issue.message,
						})),
					),
				);
				return;
			}
			next(error);
		}
	};
};
