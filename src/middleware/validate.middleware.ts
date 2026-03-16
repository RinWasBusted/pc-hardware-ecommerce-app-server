import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';

export const validate = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error: any) {
      const errors = error.errors?.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message
      }));
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
  };
};
