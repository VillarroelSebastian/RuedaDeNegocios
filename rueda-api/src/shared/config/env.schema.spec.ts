import { describe, expect, it } from 'vitest';
import { parseEnv } from './env.schema.js';

const baseEnv = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/rueda',
  JWT_SECRET: 'a-development-secret',
};

describe('parseEnv', () => {
  it('applies the production defaults of the legacy backend', () => {
    const env = parseEnv(baseEnv);

    expect(env.PORT).toBe(3334);
    expect(env.BIND_ADDRESS).toBe('127.0.0.1');
    expect(env.NODE_ENV).toBe('development');
  });

  it('coerces PORT to a number', () => {
    expect(parseEnv({ ...baseEnv, PORT: '4000' }).PORT).toBe(4000);
  });

  it('splits CORS_ORIGINS into a trimmed list', () => {
    const env = parseEnv({ ...baseEnv, CORS_ORIGINS: 'https://a.test, https://b.test ,' });

    expect(env.CORS_ORIGINS).toEqual(['https://a.test', 'https://b.test']);
  });

  it('falls back to WEB_URL when CORS_ORIGINS is absent', () => {
    const env = parseEnv({ ...baseEnv, WEB_URL: 'https://app.test' });

    expect(env.CORS_ORIGINS).toEqual(['https://app.test']);
  });

  it('falls back to localhost when neither CORS_ORIGINS nor WEB_URL is set', () => {
    expect(parseEnv(baseEnv).CORS_ORIGINS).toEqual(['http://localhost:3000']);
  });

  it('splits UPLOAD_HOSTS into a trimmed list', () => {
    const env = parseEnv({ ...baseEnv, UPLOAD_HOSTS: 'cdn.test , img.test' });

    expect(env.UPLOAD_HOSTS).toEqual(['cdn.test', 'img.test']);
  });

  it('defaults UPLOAD_HOSTS to an empty list', () => {
    expect(parseEnv(baseEnv).UPLOAD_HOSTS).toEqual([]);
  });

  it('rejects a short JWT_SECRET in production', () => {
    expect(() => parseEnv({ ...baseEnv, NODE_ENV: 'production' })).toThrow(/JWT_SECRET/);
  });

  it('accepts a 32 character JWT_SECRET in production', () => {
    const env = parseEnv({ ...baseEnv, NODE_ENV: 'production', JWT_SECRET: 'x'.repeat(32) });

    expect(env.NODE_ENV).toBe('production');
  });

  it('rejects a missing DATABASE_URL', () => {
    expect(() => parseEnv({ JWT_SECRET: 'secret' })).toThrow(/DATABASE_URL/);
  });

  it('rejects an unknown NODE_ENV', () => {
    expect(() => parseEnv({ ...baseEnv, NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });
});
