// Custom error classes. Each carries the HTTP status the API should return.
class AppError extends Error {
  constructor(status, message, details = []) {
    super(message);
    this.status = status;
    this.details = details; // [{ field, message }]
  }
}
class ValidationError extends AppError { constructor(message, details) { super(400, message, details); } }
class NotFoundError   extends AppError { constructor(message) { super(404, message); } }
class ConflictError   extends AppError { constructor(message, details) { super(409, message, details); } }

module.exports = { AppError, ValidationError, NotFoundError, ConflictError };
