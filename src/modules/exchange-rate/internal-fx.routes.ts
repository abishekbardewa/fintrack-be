import { Router } from 'express';
import { requireCronSecret } from '../../shared/middleware/cronAuth.js';
import { syncTodayExternalCron } from './internal-fx.controller.js';

const internalFxRouter = Router();

internalFxRouter.post('/sync-today', requireCronSecret, syncTodayExternalCron);

export default internalFxRouter;
