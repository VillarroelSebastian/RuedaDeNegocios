import { Module } from '@nestjs/common';
import { ExtrasController } from './extras.controller.js';

@Module({
  controllers: [ExtrasController],
})
export class ExtrasModule {}
