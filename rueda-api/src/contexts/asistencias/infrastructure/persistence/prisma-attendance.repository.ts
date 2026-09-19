import { Injectable } from '@nestjs/common';
import { ConflictError } from '../../../../shared/domain/errors/domain.error.js';
import { PrismaService } from '../../../../shared/infrastructure/persistence/prisma.service.js';
import type {
  AttendanceListFilters,
  AttendanceOutcome,
  AttendanceRepositoryPort,
  RunningEvent,
  ScannedParticipant,
} from '../../domain/ports/attendance.repository.port.js';

/** A reader that fires twice within this window is one scan, not two. */
const DOUBLE_SCAN_GRACE_MS = 60_000;
const MAX_ROWS = 200;

@Injectable()
export class PrismaAttendanceRepository implements AttendanceRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findRunningEvent(): Promise<RunningEvent | null> {
    const row = await this.prisma.evento.findFirst({
      where: { esPrincipal: 1, estaActivo: { not: 0 } },
      select: { id: true, fechaInicioEvento: true, fechaFinEvento: true },
    });
    if (!row) return null;

    return { id: row.id, startsAt: row.fechaInicioEvento, endsAt: row.fechaFinEvento };
  }

  async isStaffEnabled(userId: number): Promise<boolean> {
    const row = await this.prisma.usuario.findFirst({
      where: {
        id: userId,
        estaActivo: 1,
        rolEvento: { in: ['TECNICO', 'TECNICO_EVENTOS', 'ADMINISTRADOR'] },
      },
      select: { id: true },
    });
    return row !== null;
  }

  async findGrantedParticipant(
    companyUserId: number,
    eventId: number,
  ): Promise<ScannedParticipant | null> {
    const row = await this.prisma.empresa_usuario.findFirst({
      where: {
        id: companyUserId,
        estaActivo: 1,
        empresaevento: {
          evento_id: eventId,
          estaActivo: 1,
          estadoHabilitacionAcceso: 'HABILITADO',
          estadoVerificacionPago: 'COMPLETADO',
        },
      },
      include: { usuario: true, empresa: true },
    });
    if (!row) return null;

    const nombres = row.nombresEvento || row.usuario.nombres;
    const paterno = row.apellidoPaternoEvento || row.usuario.apellidoPaterno;
    return {
      companyUserId: row.id,
      nombre: `${nombres} ${paterno}`.trim(),
      empresa: row.empresa.nombre,
      cargo: row.cargo,
    };
  }

  async recordAttendance(input: {
    eventId: number;
    companyUserId: number;
    staffUserId: number;
    attendanceDate: Date;
    dailyLimit: number;
  }): Promise<AttendanceOutcome> {
    return this.prisma.$transaction(async (tx) => {
      // Serialises concurrent scans of the same badge without locking the table.
      await tx.$queryRawUnsafe(
        'SELECT 1::int AS locked FROM (SELECT pg_advisory_xact_lock($1, $2)) AS lock_row',
        input.eventId,
        input.companyUserId,
      );

      const dayFilter = {
        evento_id: input.eventId,
        empresa_usuario_id: input.companyUserId,
        fechaAsistencia: input.attendanceDate,
        estaActivo: 1,
      };

      // Some QR readers emit the same code twice before the view can react.
      // The immediate retry must not spend another use.
      const recent = await tx.asistenciaevento.findFirst({
        where: { ...dayFilter, fechaHoraAsistencia: { gte: new Date(Date.now() - DOUBLE_SCAN_GRACE_MS) } },
        orderBy: [{ fechaHoraAsistencia: 'desc' }, { id: 'desc' }],
      });
      if (recent) {
        return {
          fechaHoraAsistencia: recent.fechaHoraAsistencia,
          usesToday: await tx.asistenciaevento.count({ where: dayFilter }),
          duplicate: true,
        };
      }

      const usesToday = await tx.asistenciaevento.count({ where: dayFilter });
      if (usesToday >= input.dailyLimit) {
        throw new ConflictError(
          `Esta credencial ya utilizó sus ${input.dailyLimit} registros de asistencia de hoy.`,
        );
      }

      const created = await tx.asistenciaevento.create({
        data: {
          evento_id: input.eventId,
          empresa_usuario_id: input.companyUserId,
          tecnico_id: input.staffUserId,
          fechaAsistencia: input.attendanceDate,
          numeroUso: usesToday + 1,
          estaActivo: 1,
        },
      });

      return {
        fechaHoraAsistencia: created.fechaHoraAsistencia,
        usesToday: usesToday + 1,
        duplicate: false,
      };
    });
  }

  async countUsesOn(
    eventId: number,
    companyUserId: number,
    attendanceDate: Date,
  ): Promise<number> {
    return this.prisma.asistenciaevento.count({
      where: {
        evento_id: eventId,
        empresa_usuario_id: companyUserId,
        fechaAsistencia: attendanceDate,
        estaActivo: 1,
      },
    });
  }

  async findLastUseOn(eventId: number, companyUserId: number, attendanceDate: Date) {
    return this.prisma.asistenciaevento.findFirst({
      where: {
        evento_id: eventId,
        empresa_usuario_id: companyUserId,
        fechaAsistencia: attendanceDate,
        estaActivo: 1,
      },
      orderBy: { fechaHoraAsistencia: 'desc' },
      select: { id: true, fechaHoraAsistencia: true },
    });
  }

  async list(eventId: number, filters: AttendanceListFilters): Promise<unknown[]> {
    return this.prisma.asistenciaevento.findMany({
      where: {
        evento_id: eventId,
        estaActivo: 1,
        ...(filters.companyEventId
          ? { empresa_usuario: { empresaevento_id: filters.companyEventId, estaActivo: 1 } }
          : { tecnico_id: filters.staffUserId }),
      },
      orderBy: [{ fechaHoraAsistencia: 'desc' }, { id: 'desc' }],
      include: {
        empresa_usuario: {
          include: {
            usuario: { select: { nombres: true, apellidoPaterno: true } },
            empresa: { select: { nombre: true, ciudad: { include: { pais: true } } } },
          },
        },
        tecnico: { select: { nombres: true, apellidoPaterno: true } },
        evento: { select: { ciudadEvento: true, paisEvento: true } },
      },
      take: MAX_ROWS,
    });
  }
}
