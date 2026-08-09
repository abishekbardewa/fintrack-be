import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import { getDashboard } from './dashboard.controller.js';
import { getDashboardQuerySchema } from './dashboard.validation.js';

const dashboardRouter = Router();

dashboardRouter.use(requireAuth);
dashboardRouter.get('/', validate({ query: getDashboardQuerySchema }), getDashboard);

export default dashboardRouter;
