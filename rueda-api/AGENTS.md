# Code Review Rules — rueda-api

Backend of the Rueda de Negocios event platform. NestJS 12 (ESM) + Prisma 7 +
PostgreSQL, hexagonal architecture by bounded context.

## Architecture

- Layout: `src/contexts/<context>/{domain,application,infrastructure}`.
- `domain` imports nothing from `application` or `infrastructure`. `application`
  depends only on ports. `infrastructure` may import `domain`.
- Read models the domain talks about live in `domain/models`, never in the port
  files, so the domain never reaches up into the application layer.
- A cross-context driven port is declared by the consumer and implemented by the
  owner of the data. The owning module provides and exports it; the consumer
  imports that module. A table has one writer; cross-context reads go through
  the owner's port, not a private query.

## Conventions

- Code, comments and identifiers in English. User-facing error messages in
  Spanish, copied verbatim from the legacy backend (accents included, or omitted
  where the original omitted them).
- Entity/DTO field names mirror the Prisma columns (Spanish); technical and
  structural names are in English.
- No path aliases. Relative imports with the `.js` extension (ESM nodenext).
- Controllers declare literal routes before parametrised ones.
- Ownership from the token: `eeId`/`euId`/`usuarioId` always come from
  `@CurrentUser` via `enrollmentOf(user)` / `membershipOf(user)`, never from the
  body or query. Exceptions: public flows authenticated with a signed HMAC token.
- Everything that can reject is checked before anything is written.
- Mail and notifications never bring down the operation that triggered them:
  `try/catch` + `logger.warn`.
- Public endpoints: `@Public()`, and `@RateLimit` when they write.

## TypeScript

- Use `const`/`let`, never `var`. No `any` in domain or application code.
- Prefer interfaces for object shapes.

## Testing

- Strict TDD: the spec comes first.
- Each context keeps a `test-doubles.ts` at its root; fakes honour the same
  filters the real adapter applies (e.g. scoping by event).
- Verify with build + test + lint + the startup e2e after each context.
