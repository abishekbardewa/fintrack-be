import type { Request, Response } from 'express';
import { messages } from '../../config/messages.js';
import { AppError } from '../../shared/errors/AppError.js';
import { catchAsync } from '../../shared/middleware/catchAsync.js';
import { sendSuccess } from '../../shared/response/apiResponse.js';
import * as transactionExportService from './transaction.export.service.js';
import * as transactionImportService from './transaction.import.service.js';
import * as transactionService from './transaction.service.js';
import type {
	CreateTransactionBody,
	ExportTransactionsQuery,
	ImportTransactionsBody,
	ListTransactionsQuery,
	SuggestDescriptionsQuery,
	UpdateTransactionBody,
} from './transaction.validation.js';

export const listTransactions = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) {
		throw new AppError(messages.TOKEN_INVALID, 401);
	}
	const query = req.query as unknown as ListTransactionsQuery;
	const result = await transactionService.listTransactions(req.user.userId, query);
	sendSuccess({
		res,
		statusCode: 200,
		message: 'Success',
		data: result,
	});
});

export const createTransaction = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) {
		throw new AppError(messages.TOKEN_INVALID, 401);
	}
	const body = req.body as CreateTransactionBody;
	const transaction = await transactionService.createTransaction(req.user.userId, body);
	sendSuccess({
		res,
		statusCode: 201,
		message: messages.TRANSACTION_CREATED,
		data: { transaction },
	});
});

export const getTransaction = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) {
		throw new AppError(messages.TOKEN_INVALID, 401);
	}
	const transaction = await transactionService.getTransaction(req.user.userId, req.params.id as string);
	sendSuccess({
		res,
		statusCode: 200,
		message: 'Success',
		data: { transaction },
	});
});

export const updateTransaction = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) {
		throw new AppError(messages.TOKEN_INVALID, 401);
	}
	const body = req.body as UpdateTransactionBody;
	const transaction = await transactionService.updateTransaction(
		req.user.userId,
		req.params.id as string,
		body,
	);
	sendSuccess({
		res,
		statusCode: 200,
		message: messages.TRANSACTION_UPDATED,
		data: { transaction },
	});
});

export const deleteTransaction = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) {
		throw new AppError(messages.TOKEN_INVALID, 401);
	}
	await transactionService.deleteTransaction(req.user.userId, req.params.id as string);
	sendSuccess({
		res,
		statusCode: 200,
		message: messages.TRANSACTION_DELETED,
		data: null,
	});
});

export const suggestDescriptions = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) {
		throw new AppError(messages.TOKEN_INVALID, 401);
	}
	const query = req.query as unknown as SuggestDescriptionsQuery;
	const descriptions = await transactionService.suggestDescriptions(req.user.userId, query);
	sendSuccess({
		res,
		statusCode: 200,
		message: 'Success',
		data: { descriptions },
	});
});

export const exportTransactions = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) {
		throw new AppError(messages.TOKEN_INVALID, 401);
	}
	const query = req.query as unknown as ExportTransactionsQuery;
	const file = await transactionExportService.exportTransactions(req.user.userId, query);
	res.setHeader('Content-Type', file.contentType);
	res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
	res.status(200).send(file.buffer);
});

export const importTransactions = catchAsync(async (req: Request, res: Response) => {
	if (!req.user?.userId) {
		throw new AppError(messages.TOKEN_INVALID, 401);
	}
	const body = req.body as ImportTransactionsBody;
	const result = await transactionImportService.importTransactions(req.user.userId, body);
	sendSuccess({
		res,
		statusCode: 201,
		message: messages.TRANSACTION_IMPORTED,
		data: result,
	});
});
