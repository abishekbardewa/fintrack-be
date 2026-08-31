import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import {
	addReturn,
	addStartingBalance,
	contribute,
	createSaving,
	deleteSaving,
	deleteTransaction,
	getSaving,
	listSavings,
	listTransactions,
	updateSaving,
	updateTransaction,
	withdraw,
} from './saving.controller.js';
import {
	createSavingBodySchema,
	listSavingTransactionsQuerySchema,
	savingIdParamsSchema,
	savingMovementBodySchema,
	savingTransactionParamsSchema,
	startingBalanceBodySchema,
	updateSavingBodySchema,
	updateSavingTransactionBodySchema,
} from './saving.validation.js';

const savingRouter = Router();

savingRouter.use(requireAuth);

savingRouter.get('/', listSavings);
savingRouter.post('/', validate({ body: createSavingBodySchema }), createSaving);
savingRouter.get('/:id', validate({ params: savingIdParamsSchema }), getSaving);
savingRouter.patch(
	'/:id',
	validate({ params: savingIdParamsSchema, body: updateSavingBodySchema }),
	updateSaving,
);
savingRouter.delete('/:id', validate({ params: savingIdParamsSchema }), deleteSaving);

savingRouter.get(
	'/:id/transactions',
	validate({ params: savingIdParamsSchema, query: listSavingTransactionsQuerySchema }),
	listTransactions,
);
savingRouter.post(
	'/:id/starting-balance',
	validate({ params: savingIdParamsSchema, body: startingBalanceBodySchema }),
	addStartingBalance,
);
savingRouter.post(
	'/:id/contribute',
	validate({ params: savingIdParamsSchema, body: savingMovementBodySchema }),
	contribute,
);
savingRouter.post(
	'/:id/withdraw',
	validate({ params: savingIdParamsSchema, body: savingMovementBodySchema }),
	withdraw,
);
savingRouter.post(
	'/:id/return',
	validate({ params: savingIdParamsSchema, body: savingMovementBodySchema }),
	addReturn,
);
savingRouter.patch(
	'/:id/transactions/:transactionId',
	validate({ params: savingTransactionParamsSchema, body: updateSavingTransactionBodySchema }),
	updateTransaction,
);
savingRouter.delete(
	'/:id/transactions/:transactionId',
	validate({ params: savingTransactionParamsSchema }),
	deleteTransaction,
);

export default savingRouter;
