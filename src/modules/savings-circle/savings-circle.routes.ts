import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import {
	completeCircle,
	contribute,
	createSavingsCircle,
	deleteSavingsCircle,
	deleteTransaction,
	getSavingsCircle,
	listSavingsCircles,
	listTransactions,
	movePayoutToSpendable,
	recordPayout,
	updateSavingsCircle,
	updateTransaction,
} from './savings-circle.controller.js';
import {
	createSavingsCircleBodySchema,
	listSavingsCircleTransactionsQuerySchema,
	listSavingsCirclesQuerySchema,
	savingsCircleIdParamsSchema,
	savingsCircleMovementBodySchema,
	savingsCircleTransactionParamsSchema,
	updateSavingsCircleBodySchema,
	updateSavingsCircleTransactionBodySchema,
} from './savings-circle.validation.js';

const savingsCircleRouter = Router();

savingsCircleRouter.use(requireAuth);

savingsCircleRouter.get('/', validate({ query: listSavingsCirclesQuerySchema }), listSavingsCircles);
savingsCircleRouter.post('/', validate({ body: createSavingsCircleBodySchema }), createSavingsCircle);
savingsCircleRouter.get('/:id', validate({ params: savingsCircleIdParamsSchema }), getSavingsCircle);
savingsCircleRouter.patch(
	'/:id',
	validate({ params: savingsCircleIdParamsSchema, body: updateSavingsCircleBodySchema }),
	updateSavingsCircle,
);
savingsCircleRouter.delete('/:id', validate({ params: savingsCircleIdParamsSchema }), deleteSavingsCircle);

savingsCircleRouter.get(
	'/:id/transactions',
	validate({ params: savingsCircleIdParamsSchema, query: listSavingsCircleTransactionsQuerySchema }),
	listTransactions,
);
savingsCircleRouter.post(
	'/:id/contribute',
	validate({ params: savingsCircleIdParamsSchema, body: savingsCircleMovementBodySchema }),
	contribute,
);
savingsCircleRouter.post(
	'/:id/payout',
	validate({ params: savingsCircleIdParamsSchema, body: savingsCircleMovementBodySchema }),
	recordPayout,
);
savingsCircleRouter.post(
	'/:id/payout-to-spendable',
	validate({ params: savingsCircleIdParamsSchema, body: savingsCircleMovementBodySchema }),
	movePayoutToSpendable,
);
savingsCircleRouter.post('/:id/complete', validate({ params: savingsCircleIdParamsSchema }), completeCircle);
savingsCircleRouter.patch(
	'/:id/transactions/:transactionId',
	validate({
		params: savingsCircleTransactionParamsSchema,
		body: updateSavingsCircleTransactionBodySchema,
	}),
	updateTransaction,
);
savingsCircleRouter.delete(
	'/:id/transactions/:transactionId',
	validate({ params: savingsCircleTransactionParamsSchema }),
	deleteTransaction,
);

export default savingsCircleRouter;
