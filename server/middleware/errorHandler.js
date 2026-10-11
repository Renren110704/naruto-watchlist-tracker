import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { isDbConnected } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';

export function requireDb(req, res, next) {
  if (!isDbConnected()) {
    throw new ApiError(503, 'The database is temporarily unavailable. Please try again shortly.', {
      code: 'DB_UNAVAILABLE',
    });
  }
  next();
}

export function notFound(req, res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let error = err;

  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
    error = ApiError.validation(details);
  } else if (err instanceof mongoose.Error.CastError) {
    error = ApiError.badRequest(`Invalid value for ${err.path}`);
  } else if (err?.code === 11000) {
    error = ApiError.conflict('That record already exists');
  } else if (err?.type === 'entity.parse.failed') {
    error = ApiError.badRequest('Malformed JSON body');
  } else if (err?.type === 'entity.too.large') {
    error = new ApiError(413, 'Request body is too large', { code: 'PAYLOAD_TOO_LARGE' });
  } else if (err instanceof mongoose.Error && /buffering timed out|ECONNREFUSED|topology/i.test(err.message)) {
    error = new ApiError(503, 'The database is temporarily unavailable. Please try again shortly.', {
      code: 'DB_UNAVAILABLE',
    });
  }

  if (!(error instanceof ApiError)) {
    if (!env.isTest) console.error(err);
    error = new ApiError(500, 'Something went wrong on our side. Please try again.', { code: 'INTERNAL_ERROR' });
    if (!env.isProduction) error.debug = err?.message;
  }

  const body = { error: { message: error.message, code: error.code } };
  if (error.details) body.error.details = error.details;
  if (error.debug) body.error.debug = error.debug;
  res.status(error.status || 500).json(body);
}
