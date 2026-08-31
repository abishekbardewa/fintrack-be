import type { Request, Response } from 'express';
import { messages } from '../../config/messages.js';
import { AppError } from '../../shared/errors/AppError.js';
import { catchAsync } from '../../shared/middleware/catchAsync.js';
import { sendSuccess } from '../../shared/response/apiResponse.js';
import * as savingsCircleService from './savings-circle.service.js';
import type {
	CreateSavingsCircleBody,
	ListSavingsCircleTransactionsQuery,
	ListSavingsCirclesQuery,
	SavingsCircleMovementBody,
	UpdateSavingsCircleBody,
	UpdateSavingsCircleTransactionBody,
} from './savings-circle.validation.js';

export const listSavingsCircles = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) throw new AppError(messages.TOKEN_INVALID, 401);
	const query = req.query as unknown as ListSavingsCirclesQuery;
	const result = await savingsCircleService.listSavingsCircles(req.user.userId, query);
	sendSuccess({ res, statusCode: 200, message: 'Success', data: result });
});

export const createSavingsCircle = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) throw new AppError(messages.TOKEN_INVALID, 401);
	const body = req.body as CreateSavingsCircleBody;
	const circle = await savingsCircleService.createSavingsCircle(req.user.userId, body);
	sendSuccess({
		res,
		statusCode: 201,
		message: messages.SAVINGS_CIRCLE_CREATED,
		data: { circle },
	});
});

export const getSavingsCircle = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) throw new AppError(messages.TOKEN_INVALID, 401);
	const circle = await savingsCircleService.getSavingsCircle(req.user.userId, req.params.id as string);
	sendSuccess({ res, statusCode: 200, message: 'Success', data: { circle } });
});

export const updateSavingsCircle = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) throw new AppError(messages.TOKEN_INVALID, 401);
	const body = req.body as UpdateSavingsCircleBody;
	const circle = await savingsCircleService.updateSavingsCircle(
		req.user.userId,
		req.params.id as string,
		body,
	);
	sendSuccess({
		res,
		statusCode: 200,
		message: messages.SAVINGS_CIRCLE_UPDATED,
		data: { circle },
	});
});

export const deleteSavingsCircle = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) throw new AppError(messages.TOKEN_INVALID, 401);
	await savingsCircleService.deleteSavingsCircle(req.user.userId, req.params.id as string);
	sendSuccess({
		res,
		statusCode: 200,
		message: messages.SAVINGS_CIRCLE_DELETED,
		data: null,
	});
});

export const listTransactions = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) throw new AppError(messages.TOKEN_INVALID, 401);
	const query = req.query as unknown as ListSavingsCircleTransactionsQuery;
	const result = await savingsCircleService.listTransactions(
		req.user.userId,
		req.params.id as string,
		query,
	);
	sendSuccess({ res, statusCode: 200, message: 'Success', data: result });
});

export const contribute = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) throw new AppError(messages.TOKEN_INVALID, 401);
	const body = req.body as SavingsCircleMovementBody;
	const result = await savingsCircleService.addContribution(
		req.user.userId,
		req.params.id as string,
		body,
	);
	sendSuccess({
		res,
		statusCode: 201,
		message: messages.SAVINGS_CIRCLE_CONTRIBUTED,
		data: result,
	});
});

export const recordPayout = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) throw new AppError(messages.TOKEN_INVALID, 401);
	const body = req.body as SavingsCircleMovementBody;
	const result = await savingsCircleService.recordPayout(
		req.user.userId,
		req.params.id as string,
		body,
	);
	sendSuccess({
		res,
		statusCode: 201,
		message: messages.SAVINGS_CIRCLE_PAYOUT_RECORDED,
		data: result,
	});
});

export const movePayoutToSpendable = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) throw new AppError(messages.TOKEN_INVALID, 401);
	const body = req.body as SavingsCircleMovementBody;
	const result = await savingsCircleService.movePayoutToSpendable(
		req.user.userId,
		req.params.id as string,
		body,
	);
	sendSuccess({
		res,
		statusCode: 201,
		message: messages.SAVINGS_CIRCLE_PAYOUT_MOVED,
		data: result,
	});
});

export const completeCircle = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) throw new AppError(messages.TOKEN_INVALID, 401);
	const circle = await savingsCircleService.completeCircle(req.user.userId, req.params.id as string);
	sendSuccess({
		res,
		statusCode: 200,
		message: messages.SAVINGS_CIRCLE_COMPLETED_MSG,
		data: { circle },
	});
});

export const updateTransaction = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) throw new AppError(messages.TOKEN_INVALID, 401);
	const body = req.body as UpdateSavingsCircleTransactionBody;
	const result = await savingsCircleService.updateTransaction(
		req.user.userId,
		req.params.id as string,
		req.params.transactionId as string,
		body,
	);
	sendSuccess({
		res,
		statusCode: 200,
		message: messages.SAVING_TRANSACTION_UPDATED,
		data: result,
	});
});

export const deleteTransaction = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) throw new AppError(messages.TOKEN_INVALID, 401);
	const circle = await savingsCircleService.deleteTransaction(
		req.user.userId,
		req.params.id as string,
		req.params.transactionId as string,
	);
	sendSuccess({
		res,
		statusCode: 200,
		message: messages.SAVING_TRANSACTION_DELETED,
		data: { circle },
	});
});
