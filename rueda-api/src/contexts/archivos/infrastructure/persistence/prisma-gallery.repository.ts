import { Injectable } from '@nestjs/common';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaService } from '../../../../shared/infrastructure/persistence/prisma.service.js';
import { UPLOADS_ROOT } from '../../../../shared/infrastructure/adapters/local-file-storage.adapter.js';
import { TECHNICIAN_ROLES } from '../../../usuarios/domain/services/staff-account.js';
import type {
  GalleryFilters,
  GalleryRepositoryPort,
  PhotoAuthor,
  PhotoRecord,
} from '../../domain/ports/gallery.repository.port.js';

const PHOTO_SELECT = {
  id: true,
  urlFoto: true,
  descripcion: true,
  autorNombre: true,
  fechaCreacion: true,
} as const;

/** `fotoevento.autorNombre` is a VarChar(155). */
const MAX_AUTHOR = 155;

@Injectable()
export class PrismaGalleryRepository implements GalleryRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findPrincipalEventId(): Promise<number | null> {
    const row = await this.prisma.evento.findFirst({
      where: { esPrincipal: 1, estaActivo: { not: 0 } },
      select: { id: true },
    });
    return row?.id ?? null;
  }

  async list(eventId: number, filters: GalleryFilters): Promise<PhotoRecord[]> {
    const staffIds = filters.soloTecnicos ? await this.technicianIds() : null;

    return this.prisma.fotoevento.findMany({
      where: {
        evento_id: eventId,
        estaActivo: 1,
        ...(staffIds ? { usuario_id: { in: staffIds } } : {}),
      },
      orderBy: { fechaCreacion: 'desc' },
      take: filters.limit,
      select: PHOTO_SELECT,
    });
  }

  private async technicianIds(): Promise<number[]> {
    const rows = await this.prisma.usuario.findMany({
      where: { rolEvento: { in: [...TECHNICIAN_ROLES] }, estaActivo: 1 },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  async findGrantedMembership(
    companyUserId: number,
    eventId: number,
  ): Promise<{ id: number; nombre: string } | null> {
    const row = await this.prisma.empresa_usuario.findFirst({
      where: {
        id: companyUserId,
        estaActivo: 1,
        empresaevento: {
          evento_id: eventId,
          estaActivo: 1,
          estadoHabilitacionAcceso: 'HABILITADO',
        },
      },
      select: { id: true, usuario: { select: { nombres: true, apellidoPaterno: true } } },
    });
    if (!row) return null;

    return {
      id: row.id,
      nombre: `${row.usuario.nombres} ${row.usuario.apellidoPaterno}`.trim(),
    };
  }

  async findStaffAuthor(userId: number): Promise<{ id: number; nombre: string } | null> {
    const row = await this.prisma.usuario.findFirst({
      where: { id: userId, estaActivo: 1 },
      select: { id: true, nombres: true, apellidoPaterno: true },
    });
    if (!row) return null;

    return { id: row.id, nombre: `${row.nombres} ${row.apellidoPaterno}`.trim() };
  }

  async add(
    eventId: number,
    author: PhotoAuthor,
    photo: { urlFoto: string; descripcion: string | null },
  ): Promise<PhotoRecord> {
    return this.prisma.fotoevento.create({
      data: {
        evento_id: eventId,
        empresa_usuario_id: author.companyUserId,
        usuario_id: author.userId,
        autorNombre: author.nombre.slice(0, MAX_AUTHOR),
        urlFoto: photo.urlFoto,
        descripcion: photo.descripcion,
        estaActivo: 1,
      },
      select: PHOTO_SELECT,
    });
  }

  async find(photoId: number): Promise<{ id: number; companyUserId: number | null } | null> {
    const row = await this.prisma.fotoevento.findFirst({
      where: { id: photoId, estaActivo: 1 },
      select: { id: true, empresa_usuario_id: true },
    });
    return row ? { id: row.id, companyUserId: row.empresa_usuario_id } : null;
  }

  async deactivate(photoId: number): Promise<void> {
    await this.prisma.fotoevento.update({
      where: { id: photoId },
      data: { estaActivo: 0 },
    });
  }

  /**
   * The name was already checked for shape by the domain, so it cannot climb
   * out of the folder; this only answers whether the file is really there.
   */
  async uploadExists(filename: string): Promise<boolean> {
    return existsSync(join(UPLOADS_ROOT, filename));
  }
}
