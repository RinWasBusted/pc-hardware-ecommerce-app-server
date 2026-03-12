import { Router } from 'express';
import userRouter from './user/user.route.js';
import categoryRouter from './category/category.route.js';
import brandRouter from './brand/brand.route.js';
import productRouter from './product/product.route.js';
import variantRouter from './variant/variant.route.js';
import productImageRouter from './product-image/product-image.route.js';
import stockRouter from './stock/stock.route.js';

const router = Router();

router.use('/users', userRouter);
router.use('/categories', categoryRouter);
router.use('/brands', brandRouter);
router.use('/products', productRouter);
router.use('/variants', variantRouter);
router.use('/product-images', productImageRouter);
router.use('/stock', stockRouter);

export default router;
