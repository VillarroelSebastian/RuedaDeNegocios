import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ImagenesModule } from './imagenes/imagenes.module.js';
import { NotificacionesGateway } from './notificaciones/notificaciones.gateway.js';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    ImagenesModule,
  ],
  controllers: [AppController],
  providers: [AppService, NotificacionesGateway],
})
export class AppModule {}
