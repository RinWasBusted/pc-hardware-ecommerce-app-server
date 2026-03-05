import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';

export interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
    role: string;
  };
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get access token from cookies
    const token = req.cookies?.access_token;
    
    if (!token) {
      return res.status(401).json({ error: 'Token không được cung cấp' });
    }
    
    const payload = verifyAccessToken(token);
    (req as AuthRequest).user = payload;
    
    next();
  } catch (error: any) {
    return res.status(401).json({ error: 'Token không hợp lệ hoặc đã hết hạn' });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthRequest).user;
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (roles.length > 0 && !roles.includes(user.role)) {
      return res.status(403).json({ error: 'Bạn không có quyền truy cập' });
    }
    
    next();
  };
};
