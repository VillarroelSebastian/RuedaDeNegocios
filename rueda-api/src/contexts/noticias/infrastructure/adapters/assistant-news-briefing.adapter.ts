import { Injectable } from '@nestjs/common';
import type { NewsBriefingPort } from '../../../asistente/application/ports/news-briefing.port.js';
import type { AssistantNews } from '../../../asistente/domain/models/assistant-view.js';
import { PrismaService } from '../../../../shared/infrastructure/persistence/prisma.service.js';

/**
 * Answers the assistant about the announcements. It lives here because this
 * context owns what counts as published.
 */
@Injectable()
export class AssistantNewsBriefingAdapter implements NewsBriefingPort {
  constructor(private readonly prisma: PrismaService) {}

  async listPublished(eventId: number, limit: number): Promise<AssistantNews[]> {
    const rows = await this.prisma.noticia.findMany({
      where: { evento_id: eventId, estaActivo: 1, estadoPublicacion: 'PUBLICADO' },
      orderBy: { fechaHoraPublicacion: 'desc' },
      take: limit,
    });

    return rows.map((row) => ({
      tituloNoticia: row.tituloNoticia,
      contenidoNoticia: row.contenidoNoticia,
    }));
  }
}
