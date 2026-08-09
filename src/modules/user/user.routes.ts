import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import { changePassword, getMe, updateMe } from './user.controller.js';
import { changePasswordBodySchema, updateMeBodySchema } from './user.validation.js';

const userRouter = Router();

userRouter.use(requireAuth);
userRouter.get('/me', getMe);
userRouter.patch('/me', validate({ body: updateMeBodySchema }), updateMe);
userRouter.patch('/me/password', validate({ body: changePasswordBodySchema }), changePassword);

export default userRouter;
