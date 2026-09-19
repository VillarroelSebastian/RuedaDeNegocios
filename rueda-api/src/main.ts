import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { mkdirSync } from 'node:fs';
import { AppModule } from './app.module.js';
import { parseEnv } from './shared/config/env.schema.js';
import { UPLOADS_ROOT } from './shared/infrastructure/adapters/local-file-storage.adapter.js';

async function bootstrap(): Promise<void> {
  const env = parseEnv();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Every resource is versioned; the liveness probe stays at the root so the
  // proxy can check it without knowing the current API version.
  app.setGlobalPrefix('api/v1', { exclude: [''] });

  // Nginx terminates TLS and forwards the real client IP.
  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.enableCors({ origin: env.CORS_ORIGINS, credentials: true });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false }),
  );
  mkdirSync(UPLOADS_ROOT, { recursive: true });
  app.useStaticAssets(UPLOADS_ROOT, {
    prefix: '/uploads',
    setHeaders: (res, filePath) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self' data:");
      if (filePath.toLowerCase().endsWith('.pdf')) res.setHeader('Content-Disposition', 'attachment');
    },
  });

  await app.listen(env.PORT, env.BIND_ADDRESS);
}

void bootstrap();
