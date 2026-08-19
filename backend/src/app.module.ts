import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ImagenesModule } from './imagenes/imagenes.module.js';
import { ExtrasModule } from './extras/extras.module.js';
import { NotificacionesGateway } from './notificaciones/notificaciones.gateway.js';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthGuard } from './auth/auth.guard.js';
import { RateLimitGuard } from './auth/rate-limit.guard.js';
import { AuditInterceptor } from './auth/audit.interceptor.js';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.register({ global: true, secret: process.env.JWT_SECRET || 'development-only-change-me', signOptions: { expiresIn: '8h' } }),
    PrismaModule,
    ImagenesModule,
    ExtrasModule,
  ],
  controllers: [AppController],
  providers: [AppService, NotificacionesGateway,
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
