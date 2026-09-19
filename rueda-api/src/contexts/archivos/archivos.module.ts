import { Module } from '@nestjs/common';
import {
  AddPhotoUseCase,
  ListPhotosUseCase,
  RemovePhotoUseCase,
} from './application/use-cases/gallery.use-cases.js';
import { StoreUploadUseCase } from './application/use-cases/store-upload.use-case.js';
import { GALLERY_REPOSITORY } from './domain/ports/gallery.repository.port.js';
import { GalleryController } from './infrastructure/http/gallery.controller.js';
import { UploadsController } from './infrastructure/http/uploads.controller.js';
import { PrismaGalleryRepository } from './infrastructure/persistence/prisma-gallery.repository.js';

/** Files the event stores, and the gallery built out of some of them. */
@Module({
  controllers: [UploadsController, GalleryController],
  providers: [
    StoreUploadUseCase,
    ListPhotosUseCase,
    AddPhotoUseCase,
    RemovePhotoUseCase,
    { provide: GALLERY_REPOSITORY, useClass: PrismaGalleryRepository },
  ],
})
export class ArchivosModule {}
