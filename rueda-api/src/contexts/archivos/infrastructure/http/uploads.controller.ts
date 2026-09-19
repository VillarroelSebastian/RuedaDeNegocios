import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Public } from '../../../../shared/infrastructure/http/decorators/public.decorator.js';
import { RateLimit } from '../../../../shared/infrastructure/http/decorators/rate-limit.decorator.js';
import {
  type IncomingFile,
  StoreUploadUseCase,
} from '../../application/use-cases/store-upload.use-case.js';
import { MAX_UPLOAD_BYTES } from '../../domain/services/upload-validation.js';

/** Uploading is cheap for a caller and expensive for us, so it is throttled. */
const UPLOAD_LIMIT = { attempts: 30, windowMs: 15 * 60 * 1000 };

/**
 * Takes a file from a device and stores it, handing back the URL everything
 * else refers to it by.
 *
 * Replaces `POST /admin/imagenes/upload` and `POST /public/imagenes/upload`,
 * which were one handler behind two paths. It stays open to callers without an
 * account because a company uploads its payment receipt while registering,
 * before it has one — so it is rate limited instead.
 */
@Public()
@Controller('uploads')
export class UploadsController {
  constructor(private readonly storeUpload: StoreUploadUseCase) {}

  @RateLimit(UPLOAD_LIMIT)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }))
  upload(@UploadedFile() file?: IncomingFile): Promise<{ url: string }> {
    return this.storeUpload.execute(file);
  }
}
