import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { AUTH_COOKIE, clearAuthCookie, verifyToken } from '../utils/auth.js';

export async function requireAuth(req, res, next) {
  const token = req.cookies?.[AUTH_COOKIE];
  if (!token) throw ApiError.unauthorized();

  let payload;
  try {
    payload = verifyToken(token);
  } catch (err) {
    clearAuthCookie(res);
    if (err instanceof jwt.TokenExpiredError) {
      throw ApiError.unauthorized('Your session has expired. Please sign in again.', { code: 'TOKEN_EXPIRED' });
    }
    throw ApiError.unauthorized('Invalid session. Please sign in again.', { code: 'TOKEN_INVALID' });
  }

  const user = await User.findById(payload.sub).select('+tokenVersion');
  if (!user || user.tokenVersion !== payload.tv) {
    clearAuthCookie(res);
    throw ApiError.unauthorized('Your session is no longer valid. Please sign in again.', { code: 'TOKEN_REVOKED' });
  }
  req.user = user;
  next();
}
