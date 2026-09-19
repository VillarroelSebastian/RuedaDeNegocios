import { z } from 'zod';

/** Splits a comma separated env value into a trimmed, non-empty list. */
const toList = (value: string): string[] =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

const MIN_PRODUCTION_SECRET_LENGTH = 32;

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3334),
    BIND_ADDRESS: z.string().min(1).default('127.0.0.1'),

    DATABASE_URL: z.string().min(1),
    JWT_SECRET: z.string().min(1),

    CORS_ORIGINS: z.string().optional(),
    WEB_URL: z.string().min(1).default('http://localhost:3000'),
    PUBLIC_URL: z.string().optional(),
    UPLOAD_HOSTS: z.string().default(''),

    MAIL_USER: z.string().optional(),
    MAIL_PASS: z.string().optional(),
    MAIL_FROM: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && env.JWT_SECRET.length < MIN_PRODUCTION_SECRET_LENGTH) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_SECRET'],
        message: `JWT_SECRET must be at least ${MIN_PRODUCTION_SECRET_LENGTH} characters in production.`,
      });
    }
  })
  .transform((env) => ({
    ...env,
    // The legacy backend resolves origins as CORS_ORIGINS || WEB_URL || localhost.
    CORS_ORIGINS: toList(env.CORS_ORIGINS ?? env.WEB_URL),
    UPLOAD_HOSTS: toList(env.UPLOAD_HOSTS),
  }));

export type Env = z.infer<typeof schema>;

/** Validates raw environment variables, throwing a readable error on failure. */
export function parseEnv(source: Record<string, unknown> = process.env): Env {
  const result = schema.safeParse(source);
  if (result.success) return result.data;

  const details = result.error.issues
    .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('; ');
  throw new Error(`Invalid environment configuration -> ${details}`);
}
