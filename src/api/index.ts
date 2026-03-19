import Router from 'express';
import { authRouter } from './auth/auth.route.js';
import userRouter from './user/user.route.js';
import adminRouter from './admin/index.js';
import categoryRouter from './category/category.route.js';
import brandRouter from './brand/brand.route.js';
import productRouter from './product/product.route.js';
import cartRouter from './cart/cart.route.js';
import couponRouter from './coupon/coupon.route.js';
import orderRouter from './order/order.route.js';
import { Authenticate, Authorize } from '../middleware/auth.middleware.js';

export const router = Router();

router.use('/auth', authRouter);
router.use('/coupons', couponRouter);
router.use('/users', userRouter);
router.use('/categories', categoryRouter);
router.use('/brands', brandRouter);
router.use('/products', productRouter);
router.use('/cart', cartRouter);
router.use('/orders', orderRouter);
router.use('/admin', Authenticate, Authorize('admin'), adminRouter);
