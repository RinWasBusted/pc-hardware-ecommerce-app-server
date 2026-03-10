import Router from 'express';
import { authRouter } from './auth/auth.route.js';
import userRouter from './user/user.route.js';
import adminRouter from './admin/index.js';
import categoryRouter from './category/category.route.js';
import { Authenticate, Authorize } from '../middleware/auth.middleware.js';

export const router = Router();

router.use('/auth', authRouter);
router.use('/users', userRouter);
router.use('/categories', categoryRouter);
router.use('/admin', Authenticate, Authorize('admin'), adminRouter);