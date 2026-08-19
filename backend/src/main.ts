import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { join } from 'path';
import { mkdirSync } from 'fs';

async function bootstrap() {
  if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
    throw new Error('JWT_SECRET debe existir y tener al menos 32 caracteres en producción.');
  }
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', 1);
  const origins = (process.env.CORS_ORIGINS || process.env.WEB_URL || 'http://localhost:3000').split(',').map((x) => x.trim());
  app.enableCors({ origin: origins, credentials: true });

  // Crear carpeta uploads si no existe
  const uploadsPath = join(process.cwd(), 'uploads');
  mkdirSync(uploadsPath, { recursive: true });

  // Servir archivos subidos estáticamente en /uploads
  app.useStaticAssets(uploadsPath, { prefix: '/uploads', setHeaders: (res, filePath) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self' data:");
    if (filePath.toLowerCase().endsWith('.pdf')) res.setHeader('Content-Disposition', 'attachment');
  } });

  await app.listen(process.env.PORT ?? 3334, process.env.BIND_ADDRESS ?? '127.0.0.1');
}
bootstrap();
