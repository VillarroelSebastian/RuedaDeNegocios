import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/persistence/prisma.service.js';
import type {
  NewsRecord,
  NewsRepositoryPort,
} from '../../domain/ports/news.repository.port.js';
import type { NewsDraft } from '../../domain/services/news-draft.js';

const NEWS_SELECT = {
  id: true,
  tituloNoticia: true,
  contenidoNoticia: true,
  urlImagenNoticia: true,
  tipoNoticia: true,
  estadoPublicacion: true,
  fechaHoraPublicacion: true,
  fechaCreacion: true,
  usuario: { select: { id: true, nombres: true, apellidoPaterno: true } },
} as const;

type NewsRow = Record<string, any>;

function toNews(row: NewsRow): NewsRecord {
  return {
    id: row.id,
    tituloNoticia: row.tituloNoticia,
    contenidoNoticia: row.contenidoNoticia,
    urlImagenNoticia: row.urlImagenNoticia,
    tipoNoticia: row.tipoNoticia,
    estadoPublicacion: row.estadoPublicacion,
    fechaHoraPublicacion: row.fechaHoraPublicacion,
    fechaCreacion: row.fechaCreacion,
    autor: row.usuario
      ? {
          id: row.usuario.id,
          nombres: row.usuario.nombres,
          apellidoPaterno: row.usuario.apellidoPaterno,
        }
      : null,
  };
}

function toColumns(draft: NewsDraft) {
  return {
    tituloNoticia: draft.tituloNoticia,
    contenidoNoticia: draft.contenidoNoticia,
    urlImagenNoticia: draft.urlImagenNoticia,
    tipoNoticia: draft.tipoNoticia,
    estadoPublicacion: draft.estadoPublicacion,
  };
}

@Injectable()
export class PrismaNewsRepository implements NewsRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findPrincipalEventId(): Promise<number | null> {
    const row = await this.prisma.evento.findFirst({
      where: { esPrincipal: 1, estaActivo: { not: 0 } },
      select: { id: true },
    });
    return row?.id ?? null;
  }

  async findEventId(eventId: number): Promise<number | null> {
    const row = await this.prisma.evento.findFirst({
      where: { id: eventId, estaActivo: { not: 0 } },
      select: { id: true },
    });
    return row?.id ?? null;
  }

  async listPublished(eventId: number): Promise<NewsRecord[]> {
    const rows = await this.prisma.noticia.findMany({
      where: { evento_id: eventId, estaActivo: 1, estadoPublicacion: 'PUBLICADO' },
      orderBy: { fechaHoraPublicacion: 'desc' },
      select: NEWS_SELECT,
    });
    return rows.map(toNews);
  }

  async listAll(eventId: number): Promise<NewsRecord[]> {
    const rows = await this.prisma.noticia.findMany({
      where: { evento_id: eventId, estaActivo: 1 },
      // The editor works on what it wrote last, published or not.
      orderBy: { fechaCreacion: 'desc' },
      select: NEWS_SELECT,
    });
    return rows.map(toNews);
  }

  async find(newsId: number, eventId: number): Promise<NewsRecord | null> {
    const row = await this.prisma.noticia.findFirst({
      where: { id: newsId, evento_id: eventId, estaActivo: 1 },
      select: NEWS_SELECT,
    });
    return row ? toNews(row) : null;
  }

  async create(
    eventId: number,
    authorId: number,
    draft: NewsDraft,
    publishedAt: Date,
  ): Promise<NewsRecord> {
    const row = await this.prisma.noticia.create({
      data: {
        evento_id: eventId,
        usuario_id: authorId,
        estaActivo: 1,
        fechaHoraPublicacion: publishedAt,
        ...toColumns(draft),
      },
      select: NEWS_SELECT,
    });
    return toNews(row);
  }

  async update(
    newsId: number,
    draft: NewsDraft,
    publishedAt: Date | null,
  ): Promise<NewsRecord> {
    const row = await this.prisma.noticia.update({
      where: { id: newsId },
      data: {
        ...toColumns(draft),
        creadoModificadoFecha: new Date(),
        ...(publishedAt ? { fechaHoraPublicacion: publishedAt } : {}),
      },
      select: NEWS_SELECT,
    });
    return toNews(row);
  }

  async deactivate(newsId: number): Promise<void> {
    await this.prisma.noticia.update({
      where: { id: newsId },
      data: { estaActivo: 0, creadoModificadoFecha: new Date() },
    });
  }
}
