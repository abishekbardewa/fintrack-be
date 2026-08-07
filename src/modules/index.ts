import { Router } from 'express';
import authRouter from './auth/auth.routes.js';
import budgetRouter from './budget/budget.routes.js';
import categoryRouter from './category/category.routes.js';
import currencyRouter from './currency/currency.routes.js';
import savingsGoalRouter from './savings-goal/savings-goal.routes.js';
import transactionRouter from './transaction/transaction.routes.js';
import userRouter from './user/user.routes.js';

const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/currencies', currencyRouter);
apiRouter.use('/categories', categoryRouter);
apiRouter.use('/transactions', transactionRouter);
apiRouter.use('/savings-goals', savingsGoalRouter);
apiRouter.use('/budgets', budgetRouter);
apiRouter.use('/', userRouter);

export default apiRouter;
