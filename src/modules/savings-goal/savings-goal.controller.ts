import type { Request, Response } from 'express';
import { messages } from '../../config/messages.js';
import { AppError } from '../../shared/errors/AppError.js';
import { catchAsync } from '../../shared/middleware/catchAsync.js';
import { sendSuccess } from '../../shared/response/apiResponse.js';
import * as savingsGoalService from './savings-goal.service.js';
import type {
	CreateContributionBody,
	CreateSavingsGoalBody,
	ListContributionsQuery,
	ListSavingsGoalsQuery,
	ReturnFromGoalBody,
	SpendFromGoalBody,
	StartingBalanceBody,
	UpdateContributionBody,
	UpdateSavingsGoalBody,
} from './savings-goal.validation.js';

export const listSavingsGoals = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) {
		throw new AppError(messages.TOKEN_INVALID, 401);
	}
	const query = req.query as unknown as ListSavingsGoalsQuery;
	const result = await savingsGoalService.listSavingsGoals(req.user.userId, query);
	sendSuccess({
		res,
		statusCode: 200,
		message: 'Success',
		data: result,
	});
});

export const createSavingsGoal = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) {
		throw new AppError(messages.TOKEN_INVALID, 401);
	}
	const body = req.body as CreateSavingsGoalBody;
	const goal = await savingsGoalService.createSavingsGoal(req.user.userId, body);
	sendSuccess({
		res,
		statusCode: 201,
		message: messages.SAVINGS_GOAL_CREATED,
		data: { goal },
	});
});

export const getSavingsGoal = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) {
		throw new AppError(messages.TOKEN_INVALID, 401);
	}
	const goal = await savingsGoalService.getSavingsGoal(req.user.userId, req.params.id as string);
	sendSuccess({
		res,
		statusCode: 200,
		message: 'Success',
		data: { goal },
	});
});

export const updateSavingsGoal = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) {
		throw new AppError(messages.TOKEN_INVALID, 401);
	}
	const body = req.body as UpdateSavingsGoalBody;
	const goal = await savingsGoalService.updateSavingsGoal(req.user.userId, req.params.id as string, body);
	sendSuccess({
		res,
		statusCode: 200,
		message: messages.SAVINGS_GOAL_UPDATED,
		data: { goal },
	});
});

export const deleteSavingsGoal = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) {
		throw new AppError(messages.TOKEN_INVALID, 401);
	}
	await savingsGoalService.deleteSavingsGoal(req.user.userId, req.params.id as string);
	sendSuccess({
		res,
		statusCode: 200,
		message: messages.SAVINGS_GOAL_DELETED,
		data: null,
	});
});

export const addStartingBalance = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) {
		throw new AppError(messages.TOKEN_INVALID, 401);
	}
	const body = req.body as StartingBalanceBody;
	const result = await savingsGoalService.addStartingBalance(
		req.user.userId,
		req.params.id as string,
		body,
	);
	sendSuccess({
		res,
		statusCode: 201,
		message: messages.SAVINGS_GOAL_STARTING_BALANCE_ADDED,
		data: result,
	});
});

export const addContribution = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) {
		throw new AppError(messages.TOKEN_INVALID, 401);
	}
	const body = req.body as CreateContributionBody;
	const result = await savingsGoalService.addContribution(req.user.userId, req.params.id as string, body);
	sendSuccess({
		res,
		statusCode: 201,
		message: messages.SAVINGS_CONTRIBUTION_CREATED,
		data: result,
	});
});

export const updateContribution = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) {
		throw new AppError(messages.TOKEN_INVALID, 401);
	}
	const body = req.body as UpdateContributionBody;
	const result = await savingsGoalService.updateContribution(
		req.user.userId,
		req.params.id as string,
		req.params.contributionId as string,
		body,
	);
	sendSuccess({
		res,
		statusCode: 200,
		message: messages.SAVINGS_CONTRIBUTION_UPDATED,
		data: result,
	});
});

export const listContributions = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) {
		throw new AppError(messages.TOKEN_INVALID, 401);
	}
	const query = req.query as unknown as ListContributionsQuery;
	const result = await savingsGoalService.listContributions(
		req.user.userId,
		req.params.id as string,
		query,
	);
	sendSuccess({
		res,
		statusCode: 200,
		message: 'Success',
		data: result,
	});
});

export const deleteContribution = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) {
		throw new AppError(messages.TOKEN_INVALID, 401);
	}
	const goal = await savingsGoalService.deleteContribution(
		req.user.userId,
		req.params.id as string,
		req.params.contributionId as string,
	);
	sendSuccess({
		res,
		statusCode: 200,
		message: messages.SAVINGS_CONTRIBUTION_DELETED,
		data: { goal },
	});
});

export const spendFromGoal = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) {
		throw new AppError(messages.TOKEN_INVALID, 401);
	}
	const body = req.body as SpendFromGoalBody;
	const result = await savingsGoalService.spendFromGoal(req.user.userId, req.params.id as string, body);
	sendSuccess({
		res,
		statusCode: 201,
		message: messages.SAVINGS_GOAL_SPENT,
		data: result,
	});
});

export const returnFromGoal = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) {
		throw new AppError(messages.TOKEN_INVALID, 401);
	}
	const body = req.body as ReturnFromGoalBody;
	const result = await savingsGoalService.returnFromGoal(req.user.userId, req.params.id as string, body);
	sendSuccess({
		res,
		statusCode: 200,
		message: messages.SAVINGS_GOAL_RETURNED,
		data: result,
	});
});
