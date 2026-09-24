import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { PushService } from './push.service.js';
import { PushController } from './push.controller.js';
@Module({ imports: [PrismaModule], controllers: [PushController], providers: [PushService], exports: [PushService] })
export class PushModule {}
