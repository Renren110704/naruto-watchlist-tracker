import { validationResult } from 'express-validator';
import { ApiError } from '../utils/ApiError.js';

/** Runs express-validator chains and turns failures into a 422 with per-field messages. */
export const validate = (chains) => [
  ...chains,
  (req, res, next) => {
    const result = validationResult(req);
    if (result.isEmpty()) return next();
    const details = {};
    for (const err of result.array()) {
      const field = err.path ?? err.param ?? '_';
      if (!details[field]) details[field] = err.msg;
    }
    throw ApiError.validation(details);
  },
];
