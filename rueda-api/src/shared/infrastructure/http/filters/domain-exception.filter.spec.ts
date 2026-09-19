import { HttpStatus } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  RateLimitedError,
  UnauthorizedError,
  ValidationError,
} from '../../../domain/errors/domain.error.js';
import { toHttpStatus } from './domain-exception.filter.js';

describe('toHttpStatus', () => {
  it('maps each domain error to the status the legacy API already returned', () => {
    expect(toHttpStatus(new ValidationError('x'))).toBe(HttpStatus.BAD_REQUEST);
    expect(toHttpStatus(new UnauthorizedError('x'))).toBe(HttpStatus.UNAUTHORIZED);
    expect(toHttpStatus(new ForbiddenError('x'))).toBe(HttpStatus.FORBIDDEN);
    expect(toHttpStatus(new NotFoundError('x'))).toBe(HttpStatus.NOT_FOUND);
    expect(toHttpStatus(new ConflictError('x'))).toBe(HttpStatus.CONFLICT);
    expect(toHttpStatus(new RateLimitedError('x'))).toBe(HttpStatus.TOO_MANY_REQUESTS);
  });
});
