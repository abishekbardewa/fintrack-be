import { Router } from 'express';
import { createAccountLimiter } from '../../config/rateLimits.js';
import { validate } from '../../shared/middleware/validate.js';
import { login, register } from './auth.controller.js';
import { loginBodySchema, registerBodySchema } from './auth.validation.js';

const authRouter = Router();

authRouter.post('/create-account', createAccountLimiter, validate({ body: registerBodySchema }), register);
authRouter.post('/login', validate({ body: loginBodySchema }), login);

export default authRouter;
