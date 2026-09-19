/**
 * Transport-agnostic failures raised by the domain and application layers.
 * HTTP status codes live in the driving adapter, never here.
 */
export type DomainErrorCode =
  | 'VALIDATION'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'FORBIDDEN'
  | 'UNAUTHORIZED'
  | 'RATE_LIMITED';

export type DomainErrorMetadata = Record<string, unknown>;

export abstract class DomainError extends Error {
  abstract readonly code: DomainErrorCode;

  constructor(
    message: string,
    readonly metadata: DomainErrorMetadata = {},
  ) {
    super(message);
    this.name = new.target.name;
    Error.captureStackTrace?.(this, new.target);
  }
}

/** Input the domain refuses to accept. */
export class ValidationError extends DomainError {
  readonly code = 'VALIDATION' as const;
}

/** The requested aggregate does not exist, or is not visible to the caller. */
export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND' as const;
}

/** The operation clashes with the current state of the aggregate. */
export class ConflictError extends DomainError {
  readonly code = 'CONFLICT' as const;
}

/** The caller is authenticated but not allowed to perform the operation. */
export class ForbiddenError extends DomainError {
  readonly code = 'FORBIDDEN' as const;
}

/** The caller has no valid session. */
export class UnauthorizedError extends DomainError {
  readonly code = 'UNAUTHORIZED' as const;
}

/** The caller exceeded an allowed attempt budget. */
export class RateLimitedError extends DomainError {
  readonly code = 'RATE_LIMITED' as const;
}

export function isDomainError(value: unknown): value is DomainError {
  return value instanceof DomainError;
}
