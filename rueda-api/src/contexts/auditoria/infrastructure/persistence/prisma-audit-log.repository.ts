import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client.js';
import type { Paginated } from '../../../../shared/domain/pagination.js';
import { PrismaService } from '../../../../shared/infrastructure/persistence/prisma.service.js';
import type {
  AuditLogEntry,
  AuditLogFilters,
  AuditLogRepositoryPort,
} from '../../domain/ports/audit-log.repository.port.js';

/** `auditoria` has no Prisma model — it is written and read as raw SQL. */
interface AuditLogRow extends Omit<AuditLogEntry, 'actorNombre'> {
  /** `concat_ws` yields an empty string when the join found nobody. */
  actorNombre: string;
}

@Injectable()
export class PrismaAuditLogRepository implements AuditLogRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async list(filters: AuditLogFilters): Promise<Paginated<AuditLogEntry>> {
    const actor =
      filters.usuarioId === undefined
        ? Prisma.empty
        : Prisma.sql`WHERE a.usuario_id = ${filters.usuarioId}`;

    // The id breaks the tie: ordering by the timestamp alone repeats and skips
    // rows between pages whenever two entries share a second.
    const [rows, counted] = await Promise.all([
      this.prisma.$queryRaw<AuditLogRow[]>`
        SELECT a.id::text AS id, a.usuario_id AS "usuarioId", a.rol, a.accion, a.ruta,
               a.metodo, a.ip, a.detalles, a.fecha_creacion AS "fechaCreacion",
               concat_ws(' ', u.nombres, u."apellidoPaterno") AS "actorNombre",
               u.correo AS "actorCorreo"
        FROM auditoria a LEFT JOIN usuario u ON u.id = a.usuario_id
        ${actor}
        ORDER BY a.fecha_creacion DESC, a.id DESC
        LIMIT ${filters.limit} OFFSET ${(filters.page - 1) * filters.limit}`,
      this.prisma.$queryRaw<{ total: bigint }[]>`
        SELECT count(*) AS total FROM auditoria a ${actor}`,
    ]);

    return {
      data: rows.map((row) => ({ ...row, actorNombre: row.actorNombre || null })),
      total: Number(counted[0]?.total ?? 0),
      page: filters.page,
      limit: filters.limit,
    };
  }
}
