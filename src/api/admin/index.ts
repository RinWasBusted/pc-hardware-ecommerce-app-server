import { Router } from 'express';
import userRouter from './user/user.route.js';
import categoryRouter from './category/category.route.js';

const router = Router();

router.use('/users', userRouter);
router.use('/categories', categoryRouter);

export default router;

