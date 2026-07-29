/**
 * Custom error class for business logic failures.
 *
 * @param {string} code - Error code (e.g., 'STUDENT_NOT_FOUND')
 * @param {number} statusCode - HTTP status code (e.g., 404)
 * @param {string} description - Human-readable description for developers
 * @throws {AppError} Operational error with status code
 */
class AppError extends Error {
  constructor(code, statusCode, description) {
    super(description);
    this.code = code;
    this.statusCode = statusCode;
    this.description = description;
    this.isOperational = true;
  }
}

// *************** EXPORT MODULE ***************
module.exports = AppError;
