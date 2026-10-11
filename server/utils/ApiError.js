export class ApiError extends Error {
  constructor(status, message, { code, details } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(msg, opts) { return new ApiError(400, msg, { code: 'BAD_REQUEST', ...opts }); }
  static unauthorized(msg = 'Authentication required', opts) { return new ApiError(401, msg, { code: 'UNAUTHORIZED', ...opts }); }
  static forbidden(msg = 'Forbidden', opts) { return new ApiError(403, msg, { code: 'FORBIDDEN', ...opts }); }
  static notFound(msg = 'Not found', opts) { return new ApiError(404, msg, { code: 'NOT_FOUND', ...opts }); }
  static conflict(msg, opts) { return new ApiError(409, msg, { code: 'CONFLICT', ...opts }); }
  static validation(details, msg = 'Please fix the highlighted fields') {
    return new ApiError(422, msg, { code: 'VALIDATION_ERROR', details });
  }
}
