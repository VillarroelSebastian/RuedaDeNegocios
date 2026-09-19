# rueda-api

Backend of Rueda de Negocios, rebuilt on NestJS 12 with a hexagonal (ports and
adapters) architecture. It replaces the previous `backend/` package, whose HTTP
surface lived in a single 8 482-line controller.

## Architecture

```
src/
  shared/                       cross-cutting kernel, no business rules
    config/                     validated environment
    domain/errors/              transport-agnostic failures
    application/ports/          driven ports (clock, hasher, mailer, qr, storage)
    infrastructure/
      adapters/                 concrete implementations of those ports
      persistence/              PrismaService + global PrismaModule
      http/                     global filters and the liveness probe
  contexts/<context>/           one folder per bounded context
    domain/                     entities, value objects, repository ports
    application/                use cases, DTOs of the application layer
    infrastructure/
      http/                     driving adapters (controllers)
      persistence/              driven adapters (Prisma repositories)
```

Rules that keep the architecture honest:

- `domain/` imports nothing from `application/` or `infrastructure/`.
- `application/` depends on ports only, never on Prisma or Nest HTTP types.
- Use cases raise `DomainError` subclasses; `DomainExceptionFilter` maps them to
  HTTP status codes, so status codes never leak into business logic.
- Imports are relative and carry the `.js` extension — the package is ESM with
  `moduleResolution: nodenext`.

## Environment

Create a `.env` file at the package root. `parseEnv` validates it at boot and
fails fast with a readable message.

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `NODE_ENV` | no | `development` | `development` \| `test` \| `production` |
| `PORT` | no | `3334` | Port Nginx proxies `/api` to |
| `BIND_ADDRESS` | no | `127.0.0.1` | Bind address |
| `DATABASE_URL` | **yes** | — | PostgreSQL connection string |
| `JWT_SECRET` | **yes** | — | At least 32 characters when `NODE_ENV=production` |
| `WEB_URL` | no | `http://localhost:3000` | Public web client origin |
| `CORS_ORIGINS` | no | falls back to `WEB_URL` | Comma-separated list |
| `PUBLIC_URL` | no | — | Absolute base URL used in emails and QR payloads |
| `UPLOAD_HOSTS` | no | empty | Comma-separated allowed upload hosts |
| `MAIL_USER` | no | — | Gmail account; mails are skipped when unset |
| `MAIL_PASS` | no | — | Gmail app password |
| `MAIL_FROM` | no | `MAIL_USER` | From header |

## Commands

```bash
bun install
bunx prisma generate        # writes src/generated/prisma (gitignored)
bunx prisma migrate deploy  # applies prisma/migrations against DATABASE_URL

bun run start:dev           # watch mode
bun run build               # nest build
bun run test                # unit tests (vitest)
bun run test:e2e            # e2e tests, needs a reachable database
bun run lint                # oxlint, type-aware
```

## Notes

- The Prisma client is generated into `src/generated/prisma` because
  `nest build` pins `rootDir` to `src`.
- `uploads/` is created at boot and served statically under `/uploads` with
  `nosniff`, a restrictive CSP and forced download for PDFs.
- TypeScript stays on 6.x: the Nest CLI needs the programmatic compiler API,
  which TypeScript 7.0 does not ship (expected back in 7.1).
