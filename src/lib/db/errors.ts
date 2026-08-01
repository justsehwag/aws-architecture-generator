/**
 * Base error class for database operations.
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

/**
 * Thrown when a requested item is not found in the database.
 */
export class NotFoundError extends DatabaseError {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

/**
 * Thrown when a write operation fails due to a condition check
 * (e.g., item already exists, optimistic locking failure).
 */
export class ConditionalCheckFailedError extends DatabaseError {
  constructor(message: string) {
    super(message, 'CONDITIONAL_CHECK_FAILED');
    this.name = 'ConditionalCheckFailedError';
  }
}

/**
 * Thrown when a limit is exceeded (e.g., max templates per user).
 */
export class LimitExceededError extends DatabaseError {
  constructor(message: string) {
    super(message, 'LIMIT_EXCEEDED');
    this.name = 'LimitExceededError';
  }
}

/**
 * Thrown when input validation fails before a database operation.
 */
export class ValidationError extends DatabaseError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}
