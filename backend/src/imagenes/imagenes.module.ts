import { Module } from '@nestjs/common';
import { ImagenesController } from './imagenes.controller.js';

@Module({
  controllers: [ImagenesController],
})
export class ImagenesModule {}
