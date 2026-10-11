import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const AUTH_COOKIE = 'nwt_token';
export const CSRF_COOKIE = 'nwt_csrf';
export const CSRF_HEADER = 'x-csrf-token';

export function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), tv: user.tokenVersion ?? 0 }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
    algorithm: 'HS256',
  });
}

export function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
}

const baseCookie = () => ({ sameSite: 'lax', secure: env.cookieSecure, path: '/' });

export function setAuthCookie(res, token) {
  const { exp } = jwt.decode(token);
  res.cookie(AUTH_COOKIE, token, { ...baseCookie(), httpOnly: true, expires: new Date(exp * 1000) });
}

export function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE, { ...baseCookie(), httpOnly: true });
}

/** Double-submit CSRF token: readable cookie + matching request header. */
export function issueCsrfToken(res) {
  const token = crypto.randomBytes(32).toString('hex');
  res.cookie(CSRF_COOKIE, token, { ...baseCookie(), httpOnly: false });
  return token;
}

export function safeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}
