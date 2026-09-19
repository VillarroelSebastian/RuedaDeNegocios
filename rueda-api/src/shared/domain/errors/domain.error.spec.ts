import { describe, expect, it } from 'vitest';
import {
  ConflictError,
  DomainError,
  ForbiddenError,
  NotFoundError,
  RateLimitedError,
  UnauthorizedError,
  ValidationError,
  isDomainError,
} from './domain.error.js';

describe('DomainError', () => {
  it('exposes the message, code and metadata', () => {
    const error = new ValidationError('El correo no es válido.', { field: 'correo' });

    expect(error.message).toBe('El correo no es válido.');
    expect(error.code).toBe('VALIDATION');
    expect(error.metadata).toEqual({ field: 'correo' });
  });

  it('keeps the concrete class name so stack traces stay readable', () => {
    expect(new NotFoundError('La empresa no existe.').name).toBe('NotFoundError');
  });

  it('is a real Error subclass', () => {
    const error = new ConflictError('Ya existe una reunión en ese horario.');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(DomainError);
  });

  it('defaults metadata to an empty object', () => {
    expect(new ForbiddenError('Sin permiso.').metadata).toEqual({});
  });

  it('assigns one stable code per error kind', () => {
    expect(new NotFoundError('x').code).toBe('NOT_FOUND');
    expect(new ConflictError('x').code).toBe('CONFLICT');
    expect(new ForbiddenError('x').code).toBe('FORBIDDEN');
    expect(new UnauthorizedError('x').code).toBe('UNAUTHORIZED');
    expect(new RateLimitedError('x').code).toBe('RATE_LIMITED');
  });
});

describe('isDomainError', () => {
  it('accepts domain errors', () => {
    expect(isDomainError(new NotFoundError('x'))).toBe(true);
  });

  it('rejects plain errors and non-errors', () => {
    expect(isDomainError(new Error('x'))).toBe(false);
    expect(isDomainError('x')).toBe(false);
    expect(isDomainError(null)).toBe(false);
  });
});
