import { createClient } from 'redis';
import 'dotenv/config';

const client = createClient({
  url: process.env.REDIS_URL as string
});

const REFRESH_TOKEN_PREFIX = 'auth:refresh:token';
const USER_REFRESH_TOKENS_PREFIX = 'auth:refresh:user';
const VERIFY_CODE_PREFIX = 'verify';
const VERIFY_CODE_TTL_SECONDS = 60 * 60;
const RESET_PASSWORD_CODE_PREFIX = 'reset-password';
const RESET_PASSWORD_CODE_TTL_SECONDS = 60 * 60;

client.on('error', (err) => console.error('Redis Client Error', err));

export const connectRedis = async () => {
  if (client.isOpen) {
    return;
  }

  await client.connect();
};

export const disconnectRedis = async () => {
  if (!client.isOpen) {
    return;
  }

  await client.disconnect();
};

export const getRefreshTokenKey = (refreshToken: string) =>
  `${REFRESH_TOKEN_PREFIX}:${refreshToken}`;

export const getUserRefreshTokensKey = (userId: number) =>
  `${USER_REFRESH_TOKENS_PREFIX}:${userId}`;

export const getVerifyCodeKey = (email: string) => `${VERIFY_CODE_PREFIX}:${email}`;

export const getVerifyCodeTtlSeconds = () => VERIFY_CODE_TTL_SECONDS;

export const getResetPasswordCodeKey = (email: string) =>
  `${RESET_PASSWORD_CODE_PREFIX}:${email}`;

export const getResetPasswordCodeTtlSeconds = () => RESET_PASSWORD_CODE_TTL_SECONDS;

export const storeRefreshToken = async (
  userId: number,
  refreshToken: string,
  ttlSeconds: number
) => {
  const refreshTokenKey = getRefreshTokenKey(refreshToken);
  const userRefreshTokensKey = getUserRefreshTokensKey(userId);

  await client.set(refreshTokenKey, String(userId), { EX: ttlSeconds });
  await client.sAdd(userRefreshTokensKey, refreshToken);
  await client.expire(userRefreshTokensKey, ttlSeconds);
};

export const hasRefreshToken = async (refreshToken: string) => {
  const refreshTokenKey = getRefreshTokenKey(refreshToken);
  return (await client.exists(refreshTokenKey)) === 1;
};

export const revokeRefreshToken = async (userId: number, refreshToken: string) => {
  const refreshTokenKey = getRefreshTokenKey(refreshToken);
  const userRefreshTokensKey = getUserRefreshTokensKey(userId);

  await client.del(refreshTokenKey);
  await client.sRem(userRefreshTokensKey, refreshToken);

  const remainingTokens = await client.sCard(userRefreshTokensKey);

  if (remainingTokens === 0) {
    await client.del(userRefreshTokensKey);
  }
};

export const revokeAllRefreshTokens = async (userId: number) => {
  const userRefreshTokensKey = getUserRefreshTokensKey(userId);
  const refreshTokens = await client.sMembers(userRefreshTokensKey);

  if (refreshTokens.length > 0) {
    const refreshTokenKeys = refreshTokens.map(getRefreshTokenKey);
    await client.del(refreshTokenKeys);
  }

  await client.del(userRefreshTokensKey);
};

export const storeVerifyCode = async (email: string, code: string) => {
  await client.set(getVerifyCodeKey(email), code, { EX: VERIFY_CODE_TTL_SECONDS });
};

export const getVerifyCode = async (email: string) => {
  return client.get(getVerifyCodeKey(email));
};

export const deleteVerifyCode = async (email: string) => {
  await client.del(getVerifyCodeKey(email));
};

export const storeResetPasswordCode = async (email: string, code: string) => {
  await client.set(getResetPasswordCodeKey(email), code, { EX: RESET_PASSWORD_CODE_TTL_SECONDS });
};

export const getResetPasswordCode = async (email: string) => {
  return client.get(getResetPasswordCodeKey(email));
};

export const deleteResetPasswordCode = async (email: string) => {
  await client.del(getResetPasswordCodeKey(email));
};

export default client;
