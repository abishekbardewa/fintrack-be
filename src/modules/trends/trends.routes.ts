import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import { getTrends } from './trends.controller.js';
import { getTrendsQuerySchema } from './trends.validation.js';

const trendsRouter = Router();

trendsRouter.use(requireAuth);
trendsRouter.get('/', validate({ query: getTrendsQuerySchema }), getTrends);

export default trendsRouter;
