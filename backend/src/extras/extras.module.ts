import { Module } from '@nestjs/common';
import { PushModule } from '../push/push.module.js';
import { ExtrasController } from './extras.controller.js';

@Module({
  imports: [PushModule],
  controllers: [ExtrasController],
})
export class ExtrasModule {}
