import { Router } from 'express';
import authRouter from './auth/auth.routes.js';
import budgetRouter from './budget/budget.routes.js';
import categoryRouter from './category/category.routes.js';
import currencyRouter from './currency/currency.routes.js';
import dashboardRouter from './dashboard/dashboard.routes.js';
import adminExchangeRateRouter from './exchange-rate/admin-exchange-rate.routes.js';
import internalFxRouter from './exchange-rate/internal-fx.routes.js';
import savingsGoalRouter from './savings-goal/savings-goal.routes.js';
import savingRouter from './saving/saving.routes.js';
import savingsCircleRouter from './savings-circle/savings-circle.routes.js';
import investmentRouter from './investment/investment.routes.js';
import transactionRouter from './transaction/transaction.routes.js';
import trendsRouter from './trends/trends.routes.js';
import userRouter from './user/user.routes.js';

const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/currencies', currencyRouter);
apiRouter.use('/categories', categoryRouter);
apiRouter.use('/transactions', transactionRouter);
apiRouter.use('/savings-goals', savingsGoalRouter);
apiRouter.use('/savings', savingRouter);
apiRouter.use('/savings-circles', savingsCircleRouter);
apiRouter.use('/investments', investmentRouter);
apiRouter.use('/budgets', budgetRouter);
apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/trends', trendsRouter);
apiRouter.use('/admin/exchange-rates', adminExchangeRateRouter);
apiRouter.use('/internal/fx', internalFxRouter);
apiRouter.use('/', userRouter);

export default apiRouter;
