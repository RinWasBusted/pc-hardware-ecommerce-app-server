import type { Response, Request } from 'express';
import AppError from '../utils/appError.js';

const ErrorHandler = (err: AppError, req: Request, res: Response, next: Function) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    res.status(statusCode).json({
        success: false,
        message
    });
};

export default ErrorHandler;