import { ApiError } from '../utils/ApiError.js';
import { CSRF_COOKIE, CSRF_HEADER, safeEqual } from '../utils/auth.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Double-submit cookie check for state-changing requests. The SPA fetches a token
 * from GET /api/auth/csrf and echoes it in the X-CSRF-Token header; a cross-site
 * attacker can neither read the cookie nor set the header.
 */
export function csrfProtection(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  const cookie = req.cookies?.[CSRF_COOKIE];
  const header = req.get(CSRF_HEADER);
  if (!cookie || !header || !safeEqual(cookie, header)) {
    throw ApiError.forbidden('Security token missing or invalid. Please refresh the page and try again.', {
      code: 'CSRF_INVALID',
    });
  }
  next();
}
