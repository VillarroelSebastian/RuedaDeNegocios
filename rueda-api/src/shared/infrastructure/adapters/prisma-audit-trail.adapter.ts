import { Injectable, Logger } from '@nestjs/common';
import type { AuditEntry, AuditTrailPort } from '../../application/ports/audit-trail.port.js';
import { PrismaService } from '../persistence/prisma.service.js';

@Injectable()
export class PrismaAuditTrailAdapter implements AuditTrailPort {
  private readonly logger = new Logger(PrismaAuditTrailAdapter.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.$executeRaw`
        INSERT INTO auditoria (usuario_id, rol, accion, ruta, metodo, ip, detalles, fecha_creacion)
        VALUES (${entry.userId}, ${entry.role}, ${entry.action}, ${entry.route},
                ${entry.method}, ${entry.ip}, ${entry.details}, NOW())
      `;
    } catch (error) {
      // A failed audit write must never turn a successful request into an error.
      this.logger.warn(`Audit write failed for ${entry.action}: ${String(error)}`);
    }
  }
}
