import { Router } from 'express';
import { body } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import * as auth from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isTest ? 1000 : 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: { message: 'Too many attempts. Please wait a few minutes and try again.', code: 'RATE_LIMITED' } },
});

const usernameRule = (field = 'username') =>
  body(field)
    .isString().withMessage('Username is required')
    .trim()
    .isLength({ min: 3, max: 30 }).withMessage('Username must be 3–30 characters')
    .matches(/^[A-Za-z0-9_.-]+$/).withMessage('Use only letters, numbers, dots, dashes and underscores');

const emailRule = (field = 'email') =>
  body(field)
    .isString().withMessage('Email is required')
    .trim()
    .isEmail().withMessage('Enter a valid email address')
    .isLength({ max: 254 })
    .toLowerCase();

const newPasswordRule = (field) =>
  body(field)
    .isString().withMessage('Password is required')
    .isLength({ min: 8, max: 128 }).withMessage('Password must be 8–128 characters')
    .matches(/[A-Za-z]/).withMessage('Password must contain a letter')
    .matches(/\d/).withMessage('Password must contain a number');

router.get('/csrf', auth.getCsrf);

router.post(
  '/signup',
  authLimiter,
  validate([
    usernameRule(),
    emailRule(),
    newPasswordRule('password'),
    body('confirmPassword')
      .custom((value, { req }) => value === req.body.password)
      .withMessage('Passwords do not match'),
  ]),
  auth.signup,
);

router.post(
  '/signin',
  authLimiter,
  validate([
    emailRule(),
    body('password').isString().notEmpty().withMessage('Password is required'),
  ]),
  auth.signin,
);

router.post('/logout', auth.logout);
router.get('/me', requireAuth, auth.me);

router.patch(
  '/me',
  requireAuth,
  validate([
    usernameRule().optional(),
    emailRule().optional(),
    body('preferences.includeSpecials').optional().isBoolean().withMessage('Must be true or false').toBoolean(),
  ]),
  auth.updateProfile,
);

router.patch(
  '/password',
  requireAuth,
  authLimiter,
  validate([
    body('currentPassword').isString().notEmpty().withMessage('Current password is required'),
    newPasswordRule('newPassword'),
    body('confirmPassword')
      .custom((value, { req }) => value === req.body.newPassword)
      .withMessage('Passwords do not match'),
  ]),
  auth.changePassword,
);

router.delete(
  '/me',
  requireAuth,
  authLimiter,
  validate([body('password').isString().notEmpty().withMessage('Password is required to delete your account')]),
  auth.deleteAccount,
);

export default router;
