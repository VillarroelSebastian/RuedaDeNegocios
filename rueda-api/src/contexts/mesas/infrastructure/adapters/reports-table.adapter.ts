import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/persistence/prisma.service.js';
import type { TableReportPort } from '../../../reportes/application/ports/table-report.port.js';
import type { TableRow } from '../../../reportes/domain/models/report-views.js';

function toRow(row: { id: number; numeroMesa: number; estaActivo: number }): TableRow {
  return { id: row.id, numero: row.numeroMesa, activa: row.estaActivo === 1 };
}

/** What the reports say about the floor. */
@Injectable()
export class ReportsTableAdapter implements TableReportPort {
  constructor(private readonly prisma: PrismaService) {}

  countActive(eventId: number): Promise<number> {
    return this.prisma.mesa.count({ where: { evento_id: eventId, estaActivo: 1 } });
  }

  countDisabled(eventId: number): Promise<number> {
    return this.prisma.mesa.count({ where: { evento_id: eventId, estaActivo: 0 } });
  }

  async list(eventId: number): Promise<TableRow[]> {
    const rows = await this.prisma.mesa.findMany({
      where: { evento_id: eventId },
      orderBy: { numeroMesa: 'asc' },
      select: { id: true, numeroMesa: true, estaActivo: true },
    });

    return rows.map(toRow);
  }

  async search(eventId: number, term: string): Promise<TableRow[]> {
    const number = Number.parseInt(term, 10);
    if (Number.isNaN(number)) return [];

    const rows = await this.prisma.mesa.findMany({
      where: { evento_id: eventId, numeroMesa: number },
      orderBy: { numeroMesa: 'asc' },
      select: { id: true, numeroMesa: true, estaActivo: true },
    });

    return rows.map(toRow);
  }
}
