import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/auth.js';
import { uploadAvatarImage } from '../../shared/middleware/upload.js';
import { validate } from '../../shared/middleware/validate.js';
import { changePassword, getMe, updateAvatar, updateMe } from './user.controller.js';
import { changePasswordBodySchema, updateMeBodySchema } from './user.validation.js';

const userRouter = Router();

userRouter.use(requireAuth);
userRouter.get('/me', getMe);
userRouter.patch('/me', validate({ body: updateMeBodySchema }), updateMe);
userRouter.patch('/me/password', validate({ body: changePasswordBodySchema }), changePassword);
userRouter.put('/me/avatar', uploadAvatarImage('avatar'), updateAvatar);

export default userRouter;
