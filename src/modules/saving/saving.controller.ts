import type { Request, Response } from 'express';
import { messages } from '../../config/messages.js';
import { AppError } from '../../shared/errors/AppError.js';
import { catchAsync } from '../../shared/middleware/catchAsync.js';
import { sendSuccess } from '../../shared/response/apiResponse.js';
import * as savingService from './saving.service.js';
import type {
	CreateSavingBody,
	ListSavingTransactionsQuery,
	SavingMovementBody,
	StartingBalanceBody,
	UpdateSavingBody,
	UpdateSavingTransactionBody,
} from './saving.validation.js';

export const listSavings = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) throw new AppError(messages.TOKEN_INVALID, 401);
	const result = await savingService.listSavings(req.user.userId);
	sendSuccess({ res, statusCode: 200, message: 'Success', data: result });
});

export const createSaving = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) throw new AppError(messages.TOKEN_INVALID, 401);
	const body = req.body as CreateSavingBody;
	const saving = await savingService.createSaving(req.user.userId, body);
	sendSuccess({
		res,
		statusCode: 201,
		message: messages.SAVING_CREATED,
		data: { saving },
	});
});

export const getSaving = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) throw new AppError(messages.TOKEN_INVALID, 401);
	const saving = await savingService.getSaving(req.user.userId, req.params.id as string);
	sendSuccess({ res, statusCode: 200, message: 'Success', data: { saving } });
});

export const updateSaving = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) throw new AppError(messages.TOKEN_INVALID, 401);
	const body = req.body as UpdateSavingBody;
	const saving = await savingService.updateSaving(req.user.userId, req.params.id as string, body);
	sendSuccess({
		res,
		statusCode: 200,
		message: messages.SAVING_UPDATED,
		data: { saving },
	});
});

export const deleteSaving = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) throw new AppError(messages.TOKEN_INVALID, 401);
	await savingService.deleteSaving(req.user.userId, req.params.id as string);
	sendSuccess({
		res,
		statusCode: 200,
		message: messages.SAVING_DELETED,
		data: null,
	});
});

export const listTransactions = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) throw new AppError(messages.TOKEN_INVALID, 401);
	const query = req.query as unknown as ListSavingTransactionsQuery;
	const result = await savingService.listTransactions(
		req.user.userId,
		req.params.id as string,
		query,
	);
	sendSuccess({ res, statusCode: 200, message: 'Success', data: result });
});

export const addStartingBalance = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) throw new AppError(messages.TOKEN_INVALID, 401);
	const body = req.body as StartingBalanceBody;
	const result = await savingService.addStartingBalance(
		req.user.userId,
		req.params.id as string,
		body,
	);
	sendSuccess({
		res,
		statusCode: 201,
		message: messages.SAVING_STARTING_BALANCE_ADDED,
		data: result,
	});
});

export const contribute = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) throw new AppError(messages.TOKEN_INVALID, 401);
	const body = req.body as SavingMovementBody;
	const result = await savingService.addContribution(req.user.userId, req.params.id as string, body);
	sendSuccess({
		res,
		statusCode: 201,
		message: messages.SAVING_CONTRIBUTED,
		data: result,
	});
});

export const withdraw = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) throw new AppError(messages.TOKEN_INVALID, 401);
	const body = req.body as SavingMovementBody;
	const result = await savingService.withdrawFromSaving(
		req.user.userId,
		req.params.id as string,
		body,
	);
	sendSuccess({
		res,
		statusCode: 201,
		message: messages.SAVING_WITHDRAWN,
		data: result,
	});
});

export const addReturn = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) throw new AppError(messages.TOKEN_INVALID, 401);
	const body = req.body as SavingMovementBody;
	const result = await savingService.addReturn(req.user.userId, req.params.id as string, body);
	sendSuccess({
		res,
		statusCode: 201,
		message: messages.SAVING_RETURN_ADDED,
		data: result,
	});
});

export const updateTransaction = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) throw new AppError(messages.TOKEN_INVALID, 401);
	const body = req.body as UpdateSavingTransactionBody;
	const result = await savingService.updateTransaction(
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
	const saving = await savingService.deleteTransaction(
		req.user.userId,
		req.params.id as string,
		req.params.transactionId as string,
	);
	sendSuccess({
		res,
		statusCode: 200,
		message: messages.SAVING_TRANSACTION_DELETED,
		data: { saving },
	});
});
