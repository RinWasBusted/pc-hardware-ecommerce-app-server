import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production';
const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

export interface TokenPayload {
  userId: number;
  email: string;
  role: string;
}

export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN
  });
};

export const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN
  });
};

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
};

export const generateEmailVerificationToken = (userId: number, email: string): string => {
  return jwt.sign({ userId, email, type: 'email-verification' }, JWT_SECRET, {
    expiresIn: '24h'
  });
};

export const verifyEmailVerificationToken = (token: string): { userId: number; email: string } => {
  const decoded = jwt.verify(token, JWT_SECRET) as any;
  if (decoded.type !== 'email-verification') {
    throw new Error('Invalid token type');
  }
  return { userId: decoded.userId, email: decoded.email };
};

export const generatePasswordResetToken = (userId: number, email: string): string => {
  return jwt.sign({ userId, email, type: 'password-reset' }, JWT_SECRET, {
    expiresIn: '24h'
  });
};

export const verifyPasswordResetToken = (token: string): { userId: number; email: string } => {
  const decoded = jwt.verify(token, JWT_SECRET) as any;
  if (decoded.type !== 'password-reset') {
    throw new Error('Invalid token type');
  }
  return { userId: decoded.userId, email: decoded.email };
};
