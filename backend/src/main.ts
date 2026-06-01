import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { join } from 'path';
import { mkdirSync } from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors();

  // Crear carpeta uploads si no existe
  const uploadsPath = join(process.cwd(), 'uploads');
  mkdirSync(uploadsPath, { recursive: true });

  // Servir archivos subidos estáticamente en /uploads
  app.useStaticAssets(uploadsPath, { prefix: '/uploads' });

  await app.listen(process.env.PORT ?? 3334, '0.0.0.0');
}
bootstrap();
