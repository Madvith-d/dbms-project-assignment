import { Response } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { Role } from '@prisma/client';

const ACCESS = 'access_token';
const REFRESH = 'refresh_token';

export function cookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/',
  };
}

export function setAuthCookies(
  res: Response,
  payload: { user_id: number; email: string; role: Role }
) {
  const opts = cookieOptions();
  const accessOpts = {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  } as SignOptions;
  const refreshOpts = {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  } as SignOptions;
  const access = jwt.sign(payload, process.env.JWT_SECRET!, accessOpts);
  const refresh = jwt.sign(
    { user_id: payload.user_id },
    process.env.JWT_REFRESH_SECRET!,
    refreshOpts
  );
  res.cookie(ACCESS, access, opts);
  res.cookie(REFRESH, refresh, opts);
}

export function clearAuthCookies(res: Response) {
  const opts = cookieOptions();
  res.clearCookie(ACCESS, opts);
  res.clearCookie(REFRESH, opts);
}

export { ACCESS, REFRESH };
