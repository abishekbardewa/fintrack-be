import type { Request, Response } from 'express';
import { messages } from '../../config/messages.js';
import { AppError } from '../../shared/errors/AppError.js';
import { catchAsync } from '../../shared/middleware/catchAsync.js';
import { sendSuccess } from '../../shared/response/apiResponse.js';
import * as categoryService from './category.service.js';
import type { CreateCategoryBody, ListCategoriesQuery, UpdateCategoryBody } from './category.validation.js';

export const listCategories = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) {
		throw new AppError(messages.TOKEN_INVALID, 401);
	}
	const query = req.query as unknown as ListCategoriesQuery;
	const categories = await categoryService.listCategories(req.user.userId, query);
	sendSuccess({
		res,
		statusCode: 200,
		message: 'Success',
		data: { categories },
	});
});

export const createCategory = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) {
		throw new AppError(messages.TOKEN_INVALID, 401);
	}
	const body = req.body as CreateCategoryBody;
	const category = await categoryService.createCategory(req.user.userId, body);
	sendSuccess({
		res,
		statusCode: 201,
		message: messages.CATEGORY_CREATED,
		data: { category },
	});
});

export const updateCategory = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) {
		throw new AppError(messages.TOKEN_INVALID, 401);
	}
	const body = req.body as UpdateCategoryBody;
	const category = await categoryService.updateCategory(req.user.userId, req.params.id as string, body);
	sendSuccess({
		res,
		statusCode: 200,
		message: messages.CATEGORY_UPDATED,
		data: { category },
	});
});

export const deleteCategory = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) {
		throw new AppError(messages.TOKEN_INVALID, 401);
	}
	await categoryService.deleteCategory(req.user.userId, req.params.id as string);
	sendSuccess({
		res,
		statusCode: 200,
		message: messages.CATEGORY_DELETED,
		data: null,
	});
});
