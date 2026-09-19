import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../../../shared/domain/authenticated-user.js';
import { ROLES } from '../../../../shared/domain/role.js';
import { CurrentUser } from '../../../../shared/infrastructure/http/decorators/current-user.decorator.js';
import { Public } from '../../../../shared/infrastructure/http/decorators/public.decorator.js';
import { Roles } from '../../../../shared/infrastructure/http/decorators/roles.decorator.js';
import {
  AddPhotoUseCase,
  ListPhotosUseCase,
  RemovePhotoUseCase,
} from '../../application/use-cases/gallery.use-cases.js';
import type { PhotoRecord } from '../../domain/ports/gallery.repository.port.js';
import { AddPhotoDto, ListPhotosQueryDto } from './dto/gallery.dto.js';

const CONTRIBUTORS = [
  ROLES.ADMIN,
  ROLES.TECNICO,
  ROLES.TECNICO_EVENTOS,
  ROLES.EMPRESA,
] as const;

/**
 * Pictures of the event, taken by whoever is there.
 *
 * Replaces `GET /public/galeria`, `GET /galeria`, `POST /galeria` and
 * `DELETE /galeria/:id`. The two listings were the same query behind different
 * doors, so there is one now: the gallery of an event is public by nature.
 *
 * Who uploads and who may take a picture down come from the token; the legacy
 * routes read both from the request.
 */
@Controller('gallery')
export class GalleryController {
  constructor(
    private readonly listPhotos: ListPhotosUseCase,
    private readonly addPhoto: AddPhotoUseCase,
    private readonly removePhoto: RemovePhotoUseCase,
  ) {}

  @Public()
  @Get()
  list(@Query() query: ListPhotosQueryDto): Promise<PhotoRecord[]> {
    return this.listPhotos.execute(query);
  }

  @Roles(...CONTRIBUTORS)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  add(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddPhotoDto,
  ): Promise<PhotoRecord> {
    const [companyUserId] = user.companyUserIds;

    return this.addPhoto.execute({
      // A participant uploads as their membership; the team, as their account.
      companyUserId: companyUserId ?? null,
      userId: companyUserId ? null : user.id,
      urlFoto: dto.urlFoto,
      descripcion: dto.descripcion,
    });
  }

  /** The author takes down their own picture; the event team takes down any. */
  @Roles(...CONTRIBUTORS)
  @Delete(':photoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('photoId', ParseIntPipe) photoId: number,
  ): Promise<void> {
    const [companyUserId] = user.companyUserIds;

    return this.removePhoto.execute({
      photoId,
      companyUserId: companyUserId ?? null,
      role: user.role,
    });
  }
}
