import type { Request, Response } from 'express';
import { messages } from '../../config/messages.js';
import { AppError } from '../../shared/errors/AppError.js';
import { catchAsync } from '../../shared/middleware/catchAsync.js';
import { sendSuccess } from '../../shared/response/apiResponse.js';
import * as budgetService from './budget.service.js';
import type { ListBudgetsQuery, UpsertBudgetBody } from './budget.validation.js';

export const listBudgets = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) {
		throw new AppError(messages.TOKEN_INVALID, 401);
	}
	const query = req.query as unknown as ListBudgetsQuery;
	const budgets = await budgetService.listBudgets(req.user.userId, query);
	sendSuccess({
		res,
		statusCode: 200,
		message: 'Success',
		data: { budgets },
	});
});

export const upsertBudget = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) {
		throw new AppError(messages.TOKEN_INVALID, 401);
	}
	const body = req.body as UpsertBudgetBody;
	const budget = await budgetService.upsertBudget(req.user.userId, body);
	sendSuccess({
		res,
		statusCode: 200,
		message: messages.BUDGET_UPSERTED,
		data: { budget },
	});
});

export const deleteBudget = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) {
		throw new AppError(messages.TOKEN_INVALID, 401);
	}
	await budgetService.deleteBudget(req.user.userId, req.params.id as string);
	sendSuccess({
		res,
		statusCode: 200,
		message: messages.BUDGET_DELETED,
		data: null,
	});
});
