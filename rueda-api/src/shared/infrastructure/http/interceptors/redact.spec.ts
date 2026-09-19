import { describe, expect, it } from 'vitest';
import { MAX_AUDIT_DETAIL_LENGTH, redactBody } from './redact.js';

describe('redactBody', () => {
  it('drops every secret-bearing field', () => {
    const details = redactBody({
      email: 'empresa@test.com',
      password: 'Rueda2026!segura',
      currentPassword: 'x',
      newPassword: 'y',
      code: '654321',
      token: 'abc',
    });

    expect(JSON.parse(details)).toEqual({ email: 'empresa@test.com' });
  });

  it('keeps the legacy Spanish field names redacted too', () => {
    const details = redactBody({
      contrasenia: 'x',
      passwordActual: 'x',
      passwordNueva: 'x',
      nuevaContrasenia: 'x',
      codigo: '1',
      keep: 'yes',
    });

    expect(JSON.parse(details)).toEqual({ keep: 'yes' });
  });

  it('redacts regardless of field casing', () => {
    expect(JSON.parse(redactBody({ PassWord: 'x', ok: 1 }))).toEqual({ ok: 1 });
  });

  it('truncates long bodies so one request cannot flood the audit table', () => {
    const details = redactBody({ note: 'x'.repeat(10_000) });

    expect(details).toHaveLength(MAX_AUDIT_DETAIL_LENGTH);
  });

  it('handles an absent body', () => {
    expect(redactBody(undefined)).toBe('{}');
  });

  it('survives a body that cannot be serialised', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(redactBody(circular)).toBe('{}');
  });
});
