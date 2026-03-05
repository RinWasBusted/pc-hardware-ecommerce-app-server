import Router from 'express';
import { authRouter } from './auth/auth.route.js';

export const router = Router();

router.use('/auth', authRouter);