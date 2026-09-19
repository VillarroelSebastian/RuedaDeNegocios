import { Inject, Injectable } from '@nestjs/common';
import { ENV } from '../../../../shared/config/env.module.js';
import type { Env } from '../../../../shared/config/env.schema.js';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../../shared/domain/errors/domain.error.js';
import { STAFF_ROLES, type Role } from '../../../../shared/domain/role.js';
import {
  GALLERY_REPOSITORY,
  type GalleryRepositoryPort,
  type PhotoRecord,
} from '../../domain/ports/gallery.repository.port.js';
import { isOwnUploadUrl } from '../../domain/services/upload-validation.js';

const DEFAULT_PAGE = 60;
const MAX_PAGE = 200;
/** `fotoevento.descripcion` is a VarChar(305). */
const MAX_DESCRIPTION = 305;

export interface ListPhotosQuery {
  limit?: number;
  soloTecnicos?: boolean;
}

/** The pictures of the event, newest first. */
@Injectable()
export class ListPhotosUseCase {
  constructor(@Inject(GALLERY_REPOSITORY) private readonly gallery: GalleryRepositoryPort) {}

  async execute(query: ListPhotosQuery = {}): Promise<PhotoRecord[]> {
    const eventId = await this.gallery.findPrincipalEventId();
    if (!eventId) return [];

    return this.gallery.list(eventId, {
      limit: Math.min(Math.max(query.limit ?? DEFAULT_PAGE, 1), MAX_PAGE),
      soloTecnicos: query.soloTecnicos === true,
    });
  }
}

export interface AddPhotoCommand {
  /** The membership uploading, when a participant is behind it. */
  companyUserId: number | null;
  /** The account uploading, when a member of the event team is behind it. */
  userId: number | null;
  urlFoto: unknown;
  descripcion?: string;
}

/**
 * Adds a picture to the event's gallery. The file has to be one this API stored
 * itself: a URL pointing anywhere else would turn the gallery into a way of
 * hanging somebody else's content under the event's name.
 */
@Injectable()
export class AddPhotoUseCase {
  constructor(
    @Inject(GALLERY_REPOSITORY) private readonly gallery: GalleryRepositoryPort,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async execute(command: AddPhotoCommand): Promise<PhotoRecord> {
    const eventId = await this.gallery.findPrincipalEventId();
    if (!eventId) throw new ValidationError('No hay un evento principal activo.');

    const urlFoto = await this.assertOwnUpload(command.urlFoto);

    const author = command.companyUserId
      ? await this.participantAuthor(command.companyUserId, eventId)
      : await this.staffAuthor(command.userId);

    return this.gallery.add(eventId, author, {
      urlFoto,
      descripcion: (command.descripcion ?? '').trim().slice(0, MAX_DESCRIPTION) || null,
    });
  }

  private async assertOwnUpload(value: unknown): Promise<string> {
    const filename = isOwnUploadUrl(value, this.allowedHosts());
    if (!filename || !(await this.gallery.uploadExists(filename))) {
      throw new ValidationError('La fotografía debe subirse desde el dispositivo.');
    }

    return String(value);
  }

  private allowedHosts(): string[] {
    const base = this.env.PUBLIC_URL ?? `http://localhost:${this.env.PORT}`;
    return [new URL(base).host, ...this.env.UPLOAD_HOSTS];
  }

  private async participantAuthor(companyUserId: number, eventId: number) {
    const membership = await this.gallery.findGrantedMembership(companyUserId, eventId);
    if (!membership) {
      throw new ForbiddenError('Tu empresa aún no está habilitada para subir fotos.');
    }

    return { companyUserId, userId: null, nombre: membership.nombre };
  }

  private async staffAuthor(userId: number | null) {
    const author = userId ? await this.gallery.findStaffAuthor(userId) : null;
    if (!author) throw new ForbiddenError('No se pudo identificar quién sube la foto.');

    return { companyUserId: null, userId, nombre: author.nombre };
  }
}

export interface RemovePhotoCommand {
  photoId: number;
  /** The membership asking, when a participant is behind it. */
  companyUserId: number | null;
  role: Role;
}

/** The author takes down their own picture; the event team takes down any. */
@Injectable()
export class RemovePhotoUseCase {
  constructor(@Inject(GALLERY_REPOSITORY) private readonly gallery: GalleryRepositoryPort) {}

  async execute(command: RemovePhotoCommand): Promise<void> {
    const photo = await this.gallery.find(command.photoId);
    if (!photo) throw new NotFoundError('La foto ya no existe.');

    const isStaff = STAFF_ROLES.includes(command.role);
    const isAuthor =
      command.companyUserId !== null && photo.companyUserId === command.companyUserId;

    if (!isStaff && !isAuthor) {
      throw new ForbiddenError('Solo puedes eliminar las fotos que tú subiste.');
    }

    await this.gallery.deactivate(command.photoId);
  }
}
