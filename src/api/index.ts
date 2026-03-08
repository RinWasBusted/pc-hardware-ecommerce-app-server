import Router from 'express';
import { authRouter } from './auth/auth.route.js';
import userRouter from './user/user.route.js';
import adminRouter from './admin/admin.route.js';

export const router = Router();

router.use('/auth', authRouter);
router.use('/users', userRouter);
router.use('/admin', adminRouter);