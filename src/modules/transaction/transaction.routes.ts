import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import {
	createTransaction,
	deleteTransaction,
	getTransaction,
	listTransactions,
	suggestDescriptions,
	updateTransaction,
} from './transaction.controller.js';
import {
	createTransactionBodySchema,
	listTransactionsQuerySchema,
	suggestDescriptionsQuerySchema,
	transactionIdParamsSchema,
	updateTransactionBodySchema,
} from './transaction.validation.js';

const transactionRouter = Router();

transactionRouter.use(requireAuth);
transactionRouter.get('/', validate({ query: listTransactionsQuerySchema }), listTransactions);
transactionRouter.post('/', validate({ body: createTransactionBodySchema }), createTransaction);
transactionRouter.get(
	'/suggest-descriptions',
	validate({ query: suggestDescriptionsQuerySchema }),
	suggestDescriptions,
);
transactionRouter.get('/:id', validate({ params: transactionIdParamsSchema }), getTransaction);
transactionRouter.patch(
	'/:id',
	validate({ params: transactionIdParamsSchema, body: updateTransactionBodySchema }),
	updateTransaction,
);
transactionRouter.delete('/:id', validate({ params: transactionIdParamsSchema }), deleteTransaction);

export default transactionRouter;
