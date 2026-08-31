import type { Request, Response } from 'express';
import { messages } from '../../config/messages.js';
import { AppError } from '../../shared/errors/AppError.js';
import { catchAsync } from '../../shared/middleware/catchAsync.js';
import { sendSuccess } from '../../shared/response/apiResponse.js';
import * as investmentService from './investment.service.js';
import type {
	CloseInvestmentBody,
	CreateInvestmentBody,
	InvestmentMovementBody,
	ListInvestmentTransactionsQuery,
	ListInvestmentsQuery,
	StartingBalanceBody,
	UpdateInvestmentBody,
	UpdateInvestmentTransactionBody,
} from './investment.validation.js';

export const listInvestments = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) throw new AppError(messages.TOKEN_INVALID, 401);
	const query = req.query as unknown as ListInvestmentsQuery;
	const result = await investmentService.listInvestments(req.user.userId, query);
	sendSuccess({ res, statusCode: 200, message: 'Success', data: result });
});

export const createInvestment = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) throw new AppError(messages.TOKEN_INVALID, 401);
	const body = req.body as CreateInvestmentBody;
	const investment = await investmentService.createInvestment(req.user.userId, body);
	sendSuccess({
		res,
		statusCode: 201,
		message: messages.INVESTMENT_CREATED,
		data: { investment },
	});
});

export const getInvestment = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) throw new AppError(messages.TOKEN_INVALID, 401);
	const investment = await investmentService.getInvestment(req.user.userId, req.params.id as string);
	sendSuccess({ res, statusCode: 200, message: 'Success', data: { investment } });
});

export const updateInvestment = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) throw new AppError(messages.TOKEN_INVALID, 401);
	const body = req.body as UpdateInvestmentBody;
	const investment = await investmentService.updateInvestment(
		req.user.userId,
		req.params.id as string,
		body,
	);
	sendSuccess({
		res,
		statusCode: 200,
		message: messages.INVESTMENT_UPDATED,
		data: { investment },
	});
});

export const deleteInvestment = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) throw new AppError(messages.TOKEN_INVALID, 401);
	await investmentService.deleteInvestment(req.user.userId, req.params.id as string);
	sendSuccess({
		res,
		statusCode: 200,
		message: messages.INVESTMENT_DELETED,
		data: null,
	});
});

export const listTransactions = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) throw new AppError(messages.TOKEN_INVALID, 401);
	const query = req.query as unknown as ListInvestmentTransactionsQuery;
	const result = await investmentService.listTransactions(
		req.user.userId,
		req.params.id as string,
		query,
	);
	sendSuccess({ res, statusCode: 200, message: 'Success', data: result });
});

export const addStartingBalance = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) throw new AppError(messages.TOKEN_INVALID, 401);
	const body = req.body as StartingBalanceBody;
	const result = await investmentService.addStartingBalance(
		req.user.userId,
		req.params.id as string,
		body,
	);
	sendSuccess({
		res,
		statusCode: 201,
		message: messages.INVESTMENT_STARTING_BALANCE_ADDED,
		data: result,
	});
});

export const contribute = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) throw new AppError(messages.TOKEN_INVALID, 401);
	const body = req.body as InvestmentMovementBody;
	const result = await investmentService.addContribution(
		req.user.userId,
		req.params.id as string,
		body,
	);
	sendSuccess({
		res,
		statusCode: 201,
		message: messages.INVESTMENT_CONTRIBUTED,
		data: result,
	});
});

export const addReturn = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) throw new AppError(messages.TOKEN_INVALID, 401);
	const body = req.body as InvestmentMovementBody;
	const result = await investmentService.addReturn(req.user.userId, req.params.id as string, body);
	sendSuccess({
		res,
		statusCode: 201,
		message: messages.INVESTMENT_RETURN_ADDED,
		data: result,
	});
});

export const withdraw = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) throw new AppError(messages.TOKEN_INVALID, 401);
	const body = req.body as InvestmentMovementBody;
	const result = await investmentService.withdrawFromInvestment(
		req.user.userId,
		req.params.id as string,
		body,
	);
	sendSuccess({
		res,
		statusCode: 201,
		message: messages.INVESTMENT_WITHDRAWN,
		data: result,
	});
});

export const closeInvestment = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) throw new AppError(messages.TOKEN_INVALID, 401);
	const body = req.body as CloseInvestmentBody;
	const result = await investmentService.closeInvestment(
		req.user.userId,
		req.params.id as string,
		body,
	);
	sendSuccess({
		res,
		statusCode: 200,
		message: messages.INVESTMENT_CLOSED_OK,
		data: result,
	});
});

export const recordLoss = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) throw new AppError(messages.TOKEN_INVALID, 401);
	const body = req.body as InvestmentMovementBody;
	const result = await investmentService.recordLoss(req.user.userId, req.params.id as string, body);
	sendSuccess({
		res,
		statusCode: 201,
		message: messages.INVESTMENT_LOSS_RECORDED,
		data: result,
	});
});

export const updateTransaction = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) throw new AppError(messages.TOKEN_INVALID, 401);
	const body = req.body as UpdateInvestmentTransactionBody;
	const result = await investmentService.updateTransaction(
		req.user.userId,
		req.params.id as string,
		req.params.transactionId as string,
		body,
	);
	sendSuccess({
		res,
		statusCode: 200,
		message: messages.INVESTMENT_TRANSACTION_UPDATED,
		data: result,
	});
});

export const deleteTransaction = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) throw new AppError(messages.TOKEN_INVALID, 401);
	const investment = await investmentService.deleteTransaction(
		req.user.userId,
		req.params.id as string,
		req.params.transactionId as string,
	);
	sendSuccess({
		res,
		statusCode: 200,
		message: messages.INVESTMENT_TRANSACTION_DELETED,
		data: { investment },
	});
});
