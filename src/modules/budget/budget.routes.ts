import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import { deleteBudget, listBudgets, upsertBudget } from './budget.controller.js';
import {
	budgetIdParamsSchema,
	listBudgetsQuerySchema,
	upsertBudgetBodySchema,
} from './budget.validation.js';

const budgetRouter = Router();

budgetRouter.use(requireAuth);
budgetRouter.get('/', validate({ query: listBudgetsQuerySchema }), listBudgets);
budgetRouter.put('/', validate({ body: upsertBudgetBodySchema }), upsertBudget);
budgetRouter.delete('/:id', validate({ params: budgetIdParamsSchema }), deleteBudget);

export default budgetRouter;
