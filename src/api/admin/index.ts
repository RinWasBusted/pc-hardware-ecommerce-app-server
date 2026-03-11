import { Router } from 'express';
import userRouter from './user/user.route.js';
import categoryRouter from './category/category.route.js';
import brandRouter from './brand/brand.route.js';

const router = Router();

router.use('/users', userRouter);
router.use('/categories', categoryRouter);
router.use('/brands', brandRouter);

export default router;

