import { Router } from 'express';
import authRouter from './auth/auth.routes.js';

const apiRouter = Router();

apiRouter.use('/auth', authRouter);

export default apiRouter;
