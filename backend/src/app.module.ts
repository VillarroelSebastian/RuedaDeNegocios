import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { PushModule } from './push/push.module.js';
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
    // 24 horas: la sesión debe seguir activa para que sigan llegando notificaciones
    // push sin forzar un re-login constante durante el evento.
    JwtModule.register({ global: true, secret: process.env.JWT_SECRET || 'development-only-change-me', signOptions: { expiresIn: '24h' } }),
    PrismaModule,
    PushModule,
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
