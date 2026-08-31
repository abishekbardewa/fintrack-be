import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import {
	addContribution,
	createSavingsGoal,
	deleteContribution,
	deleteSavingsGoal,
	getSavingsGoal,
	listContributions,
	listSavingsGoals,
	returnFromGoal,
	spendFromGoal,
	addStartingBalance,
	updateContribution,
	updateSavingsGoal,
} from './savings-goal.controller.js';
import {
	contributionParamsSchema,
	createContributionBodySchema,
	createSavingsGoalBodySchema,
	listContributionsQuerySchema,
	listSavingsGoalsQuerySchema,
	returnFromGoalBodySchema,
	savingsGoalIdParamsSchema,
	spendFromGoalBodySchema,
	startingBalanceBodySchema,
	updateContributionBodySchema,
	updateSavingsGoalBodySchema,
} from './savings-goal.validation.js';

const savingsGoalRouter = Router();

savingsGoalRouter.use(requireAuth);

savingsGoalRouter.get('/', validate({ query: listSavingsGoalsQuerySchema }), listSavingsGoals);
savingsGoalRouter.post('/', validate({ body: createSavingsGoalBodySchema }), createSavingsGoal);
savingsGoalRouter.get('/:id', validate({ params: savingsGoalIdParamsSchema }), getSavingsGoal);
savingsGoalRouter.patch(
	'/:id',
	validate({ params: savingsGoalIdParamsSchema, body: updateSavingsGoalBodySchema }),
	updateSavingsGoal,
);
savingsGoalRouter.delete('/:id', validate({ params: savingsGoalIdParamsSchema }), deleteSavingsGoal);

savingsGoalRouter.get(
	'/:id/contributions',
	validate({ params: savingsGoalIdParamsSchema, query: listContributionsQuerySchema }),
	listContributions,
);
savingsGoalRouter.post(
	'/:id/starting-balance',
	validate({ params: savingsGoalIdParamsSchema, body: startingBalanceBodySchema }),
	addStartingBalance,
);
savingsGoalRouter.post(
	'/:id/contributions',
	validate({ params: savingsGoalIdParamsSchema, body: createContributionBodySchema }),
	addContribution,
);
savingsGoalRouter.patch(
	'/:id/contributions/:contributionId',
	validate({ params: contributionParamsSchema, body: updateContributionBodySchema }),
	updateContribution,
);
savingsGoalRouter.post(
	'/:id/spend',
	validate({ params: savingsGoalIdParamsSchema, body: spendFromGoalBodySchema }),
	spendFromGoal,
);
savingsGoalRouter.post(
	'/:id/return',
	validate({ params: savingsGoalIdParamsSchema, body: returnFromGoalBodySchema }),
	returnFromGoal,
);
savingsGoalRouter.delete(
	'/:id/contributions/:contributionId',
	validate({ params: contributionParamsSchema }),
	deleteContribution,
);

export default savingsGoalRouter;
