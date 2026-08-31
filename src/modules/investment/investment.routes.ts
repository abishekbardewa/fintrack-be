import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import {
	addReturn,
	addStartingBalance,
	closeInvestment,
	contribute,
	createInvestment,
	deleteInvestment,
	deleteTransaction,
	getInvestment,
	listInvestments,
	listTransactions,
	recordLoss,
	updateInvestment,
	updateTransaction,
	withdraw,
} from './investment.controller.js';
import {
	closeInvestmentBodySchema,
	createInvestmentBodySchema,
	investmentIdParamsSchema,
	investmentMovementBodySchema,
	investmentTransactionParamsSchema,
	listInvestmentTransactionsQuerySchema,
	listInvestmentsQuerySchema,
	startingBalanceBodySchema,
	updateInvestmentBodySchema,
	updateInvestmentTransactionBodySchema,
} from './investment.validation.js';

const investmentRouter = Router();

investmentRouter.use(requireAuth);

investmentRouter.get('/', validate({ query: listInvestmentsQuerySchema }), listInvestments);
investmentRouter.post('/', validate({ body: createInvestmentBodySchema }), createInvestment);
investmentRouter.get('/:id', validate({ params: investmentIdParamsSchema }), getInvestment);
investmentRouter.patch(
	'/:id',
	validate({ params: investmentIdParamsSchema, body: updateInvestmentBodySchema }),
	updateInvestment,
);
investmentRouter.delete('/:id', validate({ params: investmentIdParamsSchema }), deleteInvestment);

investmentRouter.get(
	'/:id/transactions',
	validate({ params: investmentIdParamsSchema, query: listInvestmentTransactionsQuerySchema }),
	listTransactions,
);
investmentRouter.post(
	'/:id/starting-balance',
	validate({ params: investmentIdParamsSchema, body: startingBalanceBodySchema }),
	addStartingBalance,
);
investmentRouter.post(
	'/:id/contribute',
	validate({ params: investmentIdParamsSchema, body: investmentMovementBodySchema }),
	contribute,
);
investmentRouter.post(
	'/:id/return',
	validate({ params: investmentIdParamsSchema, body: investmentMovementBodySchema }),
	addReturn,
);
investmentRouter.post(
	'/:id/withdraw',
	validate({ params: investmentIdParamsSchema, body: investmentMovementBodySchema }),
	withdraw,
);
investmentRouter.post(
	'/:id/close',
	validate({ params: investmentIdParamsSchema, body: closeInvestmentBodySchema }),
	closeInvestment,
);
investmentRouter.post(
	'/:id/loss',
	validate({ params: investmentIdParamsSchema, body: investmentMovementBodySchema }),
	recordLoss,
);
investmentRouter.patch(
	'/:id/transactions/:transactionId',
	validate({ params: investmentTransactionParamsSchema, body: updateInvestmentTransactionBodySchema }),
	updateTransaction,
);
investmentRouter.delete(
	'/:id/transactions/:transactionId',
	validate({ params: investmentTransactionParamsSchema }),
	deleteTransaction,
);

export default investmentRouter;
