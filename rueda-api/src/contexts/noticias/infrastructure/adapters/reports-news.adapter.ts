import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/persistence/prisma.service.js';
import type { NewsReportPort } from '../../../reportes/application/ports/news-report.port.js';
import type { NewsRow } from '../../../reportes/domain/models/report-views.js';

/** The latest announcements, as the company dashboard reads them. */
@Injectable()
export class ReportsNewsAdapter implements NewsReportPort {
  constructor(private readonly prisma: PrismaService) {}

  async listLatest(eventId: number, limit: number): Promise<NewsRow[]> {
    const rows = await this.prisma.noticia.findMany({
      where: { evento_id: eventId, estaActivo: 1, estadoPublicacion: 'PUBLICADO' },
      orderBy: { fechaHoraPublicacion: 'desc' },
      take: limit,
      select: {
        id: true,
        tituloNoticia: true,
        tipoNoticia: true,
        fechaHoraPublicacion: true,
      },
    });

    return rows.map((row) => ({
      id: row.id,
      titulo: row.tituloNoticia,
      tipo: row.tipoNoticia,
      fecha: row.fechaHoraPublicacion,
    }));
  }
}
