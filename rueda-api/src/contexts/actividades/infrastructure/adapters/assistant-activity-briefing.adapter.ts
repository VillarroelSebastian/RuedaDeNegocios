import { Injectable } from '@nestjs/common';
import type { ActivityBriefingPort } from '../../../asistente/application/ports/activity-briefing.port.js';
import type { AssistantActivity } from '../../../asistente/domain/models/assistant-view.js';
import { PrismaService } from '../../../../shared/infrastructure/persistence/prisma.service.js';

/**
 * Answers the assistant about the programme. It lives here because this
 * context owns that a day is a calendar day and a start is a room clock time.
 */
@Injectable()
export class AssistantActivityBriefingAdapter implements ActivityBriefingPort {
  constructor(private readonly prisma: PrismaService) {}

  async listUpcoming(eventId: number, limit: number): Promise<AssistantActivity[]> {
    const rows = await this.prisma.actividadprograma.findMany({
      where: { evento_id: eventId, estaActivo: 1 },
      orderBy: [{ fechaActividad: 'asc' }, { horaInicioActividad: 'asc' }],
      take: limit,
    });

    return rows.map((row) => ({
      nombreActividad: row.nombreActividad,
      fechaActividad: row.fechaActividad,
      horaInicioActividad: row.horaInicioActividad,
      nombreSalaEspacio: row.nombreSalaEspacio,
    }));
  }
}
