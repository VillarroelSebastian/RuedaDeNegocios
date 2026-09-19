import { Injectable } from '@nestjs/common';
import { ConflictError } from '../../../../shared/domain/errors/domain.error.js';
import { PrismaService } from '../../../../shared/infrastructure/persistence/prisma.service.js';
import { DAILY_ATTENDANCE_LIMIT } from '../../../asistencias/domain/services/daily-limit.js';
import type {
  PlatformAccess,
  SponsorAttendanceRecord,
  SponsorEvent,
  SponsorPerson,
  SponsorPersonDetail,
  SponsorRecord,
  SponsorsRepositoryPort,
} from '../../domain/ports/sponsors.repository.port.js';
import type { SponsorContribution } from '../../domain/services/sponsor-contribution.js';
import type { Representative } from '../../domain/services/sponsor-representatives.js';

const EVENT_SELECT = {
  id: true,
  nombre: true,
  edicion: true,
  ciudadEvento: true,
  paisEvento: true,
  fechaInicioEvento: true,
  fechaFinEvento: true,
} as const;

const SPONSOR_INCLUDE = {
  paquete: { select: { id: true, nombre: true, costo: true } },
  personas: { where: { estaActivo: 1 }, orderBy: { id: 'asc' as const } },
} as const;

/** Namespace of the advisory lock that serialises scans of one badge. */
const SCAN_LOCK_NAMESPACE = 78423;

type Row = Record<string, any>;

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  return typeof value === 'object' && 'toNumber' in value
    ? (value as { toNumber(): number }).toNumber()
    : Number(value);
}

function toEvent(row: Row): SponsorEvent {
  return {
    id: row.id,
    nombre: row.nombre,
    edicion: row.edicion,
    ciudadEvento: row.ciudadEvento,
    paisEvento: row.paisEvento,
    startsAt: row.fechaInicioEvento,
    endsAt: row.fechaFinEvento,
  };
}

function toPerson(row: Row): SponsorPerson {
  return {
    id: row.id,
    nombreCompleto: row.nombreCompleto,
    cargo: row.cargo,
    correo: row.correo,
    urlCredencialQR: row.urlCredencialQR,
  };
}

function toSponsor(row: Row): SponsorRecord {
  return {
    id: row.id,
    nombreEmpresa: row.nombreEmpresa,
    descripcion: row.descripcion,
    tipoAporte: row.tipoAporte,
    montoAporte: row.montoAporte === null ? null : toNumber(row.montoAporte),
    detalleAporte: row.detalleAporte,
    cantidadIngresos: row.cantidadIngresos,
    paquete: row.paquete
      ? { id: row.paquete.id, nombre: row.paquete.nombre, costo: toNumber(row.paquete.costo) }
      : null,
    personas: (row.personas ?? []).map(toPerson),
  };
}

function toColumns(contribution: SponsorContribution) {
  return {
    nombreEmpresa: contribution.nombreEmpresa,
    descripcion: contribution.descripcion,
    tipoAporte: contribution.tipoAporte,
    detalleAporte: contribution.detalleAporte,
    montoAporte: contribution.montoAporte,
    paquete_id: contribution.paqueteId,
    cantidadIngresos: contribution.cantidadIngresos,
  };
}

@Injectable()
export class PrismaSponsorsRepository implements SponsorsRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findPrincipalEvent(): Promise<SponsorEvent | null> {
    const row = await this.prisma.evento.findFirst({
      where: { esPrincipal: 1, estaActivo: { not: 0 } },
      select: EVENT_SELECT,
    });
    return row ? toEvent(row) : null;
  }

  async list(eventId: number): Promise<SponsorRecord[]> {
    const rows = await this.prisma.auspiciador.findMany({
      where: { evento_id: eventId, estaActivo: 1 },
      orderBy: { fechaCreacion: 'desc' },
      include: SPONSOR_INCLUDE,
    });
    return rows.map(toSponsor);
  }

  async find(sponsorId: number, eventId: number): Promise<SponsorRecord | null> {
    const row = await this.prisma.auspiciador.findFirst({
      where: { id: sponsorId, evento_id: eventId, estaActivo: 1 },
      include: SPONSOR_INCLUDE,
    });
    return row ? toSponsor(row) : null;
  }

  async findTakenEmail(
    emails: string[],
    exceptSponsorId: number | null,
  ): Promise<string | null> {
    if (emails.length === 0) return null;

    const [account, representative] = await Promise.all([
      this.prisma.usuario.findFirst({
        where: { correo: { in: emails, mode: 'insensitive' }, estaActivo: 1 },
        select: { correo: true },
      }),
      this.prisma.auspiciadorpersona.findFirst({
        where: {
          correo: { in: emails, mode: 'insensitive' },
          estaActivo: 1,
          ...(exceptSponsorId ? { auspiciador_id: { not: exceptSponsorId } } : {}),
        },
        select: { correo: true },
      }),
    ]);

    // A sponsor being edited keeps its own people, and those already have an
    // account of their own from the platform access.
    if (account && exceptSponsorId) {
      const own = await this.prisma.auspiciadorpersona.findFirst({
        where: {
          auspiciador_id: exceptSponsorId,
          correo: { equals: account.correo, mode: 'insensitive' },
          estaActivo: 1,
        },
        select: { id: true },
      });
      if (own) return representative?.correo ?? null;
    }

    return account?.correo ?? representative?.correo ?? null;
  }

  async create(
    eventId: number,
    contribution: SponsorContribution,
    representatives: Representative[],
  ): Promise<SponsorRecord> {
    const row = await this.prisma.auspiciador.create({
      data: {
        ...toColumns(contribution),
        evento_id: eventId,
        estaActivo: 1,
        personas: { create: representatives },
      },
      include: SPONSOR_INCLUDE,
    });
    return toSponsor(row);
  }

  async update(
    sponsorId: number,
    contribution: SponsorContribution,
    representatives: Representative[],
  ): Promise<{ sponsor: SponsorRecord; nuevas: SponsorPerson[] }> {
    const nuevas = await this.prisma.$transaction(async (tx) => {
      await tx.auspiciador.update({
        where: { id: sponsorId },
        data: { ...toColumns(contribution), creadoModificadoFecha: new Date() },
      });

      const current = await tx.auspiciadorpersona.findMany({
        where: { auspiciador_id: sponsorId, estaActivo: 1 },
        orderBy: { id: 'asc' },
      });

      // People already seated keep their row — and so their badge, printed or
      // not. Seats beyond the new list are released.
      for (const surplus of current.slice(representatives.length)) {
        await tx.auspiciadorpersona.update({
          where: { id: surplus.id },
          data: { estaActivo: 0 },
        });
      }

      const created: SponsorPerson[] = [];
      for (const [index, person] of representatives.entries()) {
        const seated = current[index];
        if (seated) {
          await tx.auspiciadorpersona.update({ where: { id: seated.id }, data: person });
          continue;
        }

        const row = await tx.auspiciadorpersona.create({
          data: { ...person, auspiciador_id: sponsorId },
        });
        created.push(toPerson(row));
      }

      return created;
    });

    const row = await this.prisma.auspiciador.findFirst({
      where: { id: sponsorId },
      include: SPONSOR_INCLUDE,
    });

    return { sponsor: toSponsor(row!), nuevas };
  }

  async deactivate(sponsorId: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.auspiciadorpersona.updateMany({
        where: { auspiciador_id: sponsorId },
        data: { estaActivo: 0 },
      });
      await tx.auspiciador.update({
        where: { id: sponsorId },
        data: { estaActivo: 0, creadoModificadoFecha: new Date() },
      });
    });
  }

  async findPerson(personId: number): Promise<SponsorPersonDetail | null> {
    const row = await this.prisma.auspiciadorpersona.findFirst({
      where: { id: personId, estaActivo: 1, auspiciador: { estaActivo: 1 } },
      include: { auspiciador: { include: { evento: { select: EVENT_SELECT } } } },
    });
    if (!row) return null;

    return {
      id: row.id,
      nombreCompleto: row.nombreCompleto,
      cargo: row.cargo,
      correo: row.correo,
      sponsorId: row.auspiciador_id,
      nombreEmpresa: row.auspiciador.nombreEmpresa,
      event: toEvent(row.auspiciador.evento),
    };
  }

  async setCredentialUrl(personId: number, url: string): Promise<void> {
    await this.prisma.auspiciadorpersona.update({
      where: { id: personId },
      data: { urlCredencialQR: url },
    });
  }

  async countAttendanceOn(eventId: number, personId: number, day: Date): Promise<number> {
    return this.prisma.asistenciaauspiciador.count({
      where: {
        evento_id: eventId,
        auspiciadorpersona_id: personId,
        fechaAsistencia: day,
        estaActivo: 1,
      },
    });
  }

  async findRecentAttendance(
    eventId: number,
    personId: number,
    day: Date,
    since: Date,
  ): Promise<{ id: number; fechaHoraAsistencia: Date } | null> {
    return this.prisma.asistenciaauspiciador.findFirst({
      where: {
        evento_id: eventId,
        auspiciadorpersona_id: personId,
        fechaAsistencia: day,
        estaActivo: 1,
        fechaHoraAsistencia: { gte: since },
      },
      orderBy: [{ fechaHoraAsistencia: 'desc' }, { id: 'desc' }],
      select: { id: true, fechaHoraAsistencia: true },
    });
  }

  async recordAttendance(input: {
    eventId: number;
    personId: number;
    technicianId: number;
    day: Date;
    graceSince: Date;
  }): Promise<{ id: number; fechaHoraAsistencia: Date; usosHoy: number; duplicada: boolean }> {
    return this.prisma.$transaction(async (tx) => {
      // Two readers may scan the same badge at once; the daily limit has to hold.
      await tx.$queryRaw`SELECT 1::int AS locked FROM (SELECT pg_advisory_xact_lock(${SCAN_LOCK_NAMESPACE}, ${input.personId})) AS lock_row`;

      const where = {
        evento_id: input.eventId,
        auspiciadorpersona_id: input.personId,
        fechaAsistencia: input.day,
        estaActivo: 1,
      };

      const recent = await tx.asistenciaauspiciador.findFirst({
        where: { ...where, fechaHoraAsistencia: { gte: input.graceSince } },
        orderBy: [{ fechaHoraAsistencia: 'desc' }, { id: 'desc' }],
      });
      const usosHoy = await tx.asistenciaauspiciador.count({ where });

      // The same code read twice in a row is one arrival, not two.
      if (recent) {
        return {
          id: recent.id,
          fechaHoraAsistencia: recent.fechaHoraAsistencia,
          usosHoy,
          duplicada: true,
        };
      }

      if (usosHoy >= DAILY_ATTENDANCE_LIMIT) {
        throw new ConflictError(
          `Esta credencial ya utilizó sus ${DAILY_ATTENDANCE_LIMIT} registros de asistencia de hoy.`,
        );
      }

      const created = await tx.asistenciaauspiciador.create({
        data: {
          evento_id: input.eventId,
          auspiciadorpersona_id: input.personId,
          tecnico_id: input.technicianId,
          fechaAsistencia: input.day,
          numeroUso: usosHoy + 1,
        },
      });

      return {
        id: created.id,
        fechaHoraAsistencia: created.fechaHoraAsistencia,
        usosHoy: usosHoy + 1,
        duplicada: false,
      };
    });
  }

  async listAttendance(eventId: number, limit: number): Promise<SponsorAttendanceRecord[]> {
    const rows = await this.prisma.asistenciaauspiciador.findMany({
      where: { evento_id: eventId, estaActivo: 1 },
      orderBy: { fechaHoraAsistencia: 'desc' },
      take: limit,
      include: {
        evento: { select: { ciudadEvento: true, paisEvento: true } },
        auspiciadorpersona: {
          include: { auspiciador: { select: { nombreEmpresa: true } } },
        },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      fechaHoraAsistencia: row.fechaHoraAsistencia,
      numeroUso: row.numeroUso,
      persona: {
        id: row.auspiciadorpersona.id,
        nombreCompleto: row.auspiciadorpersona.nombreCompleto,
        cargo: row.auspiciadorpersona.cargo,
      },
      nombreEmpresa: row.auspiciadorpersona.auspiciador.nombreEmpresa,
      lugar: [row.evento.ciudadEvento, row.evento.paisEvento].filter(Boolean).join(', '),
    }));
  }

  async grantPlatformAccess(
    sponsorId: number,
    hashedPassword: string,
  ): Promise<PlatformAccess> {
    const sponsor = await this.prisma.auspiciador.findFirst({
      where: { id: sponsorId, estaActivo: 1 },
      include: {
        paquete: { select: { tipoParticipacion: true } },
        personas: { where: { estaActivo: 1 }, orderBy: { id: 'asc' }, take: 1 },
      },
    });

    const responsible = sponsor?.personas[0];
    if (!sponsor || !responsible?.correo) return { creado: false };

    const correo = responsible.correo.trim().toLowerCase();
    const existing = await this.prisma.usuario.findFirst({
      where: { correo: { equals: correo, mode: 'insensitive' }, estaActivo: 1 },
      select: { id: true },
    });
    if (existing) return { creado: false, motivo: 'El correo ya tenía una cuenta.' };

    const city = await this.prisma.ciudad.findFirst({ orderBy: { id: 'asc' } });
    if (!city) {
      throw new ConflictError(
        'No existe una ciudad configurada para crear el acceso del auspiciador.',
      );
    }

    const [nombres, apellidoPaterno, ...rest] = responsible.nombreCompleto.trim().split(/\s+/);
    // The phone is a placeholder: a sponsor account has no number of its own,
    // and the column is required and used for duplicate checks elsewhere.
    const telefono = `AUSP-${sponsor.id}-${responsible.id}`;

    const created = await this.prisma.$transaction(async (tx) => {
      const empresa = await tx.empresa.create({
        data: {
          ciudad_id: city.id,
          nombre: sponsor.nombreEmpresa.slice(0, 55),
          rubro: 'Auspiciador',
          descripcion: sponsor.descripcion,
          telefonoWhatsapp: telefono,
          correoCorporativo: correo,
          urlFotoPerfil: '',
          estaActivo: 1,
        },
      });

      const enrollment = await tx.empresaevento.create({
        data: {
          empresa_id: empresa.id,
          evento_id: sponsor.evento_id,
          paquete_id: sponsor.paquete_id,
          tipoParticipacion: sponsor.paquete?.tipoParticipacion ?? 'PRESENCIAL',
          estadoHabilitacionAcceso: 'HABILITADO',
          estadoVerificacionPago: 'COMPLETADO',
          numeroParticipantes: sponsor.cantidadIngresos,
          estaActivo: 1,
        },
      });

      const usuario = await tx.usuario.create({
        data: {
          evento_id: sponsor.evento_id,
          nombres: nombres || 'Responsable',
          apellidoPaterno: apellidoPaterno || 'Auspiciador',
          apellidoMaterno: rest.join(' ') || null,
          correo,
          contrasenia: hashedPassword,
          telefono,
          urlFotoPerfil: '',
          rolEvento: 'EMPRESA',
          estaActivo: 1,
        },
      });

      await tx.empresa_usuario.create({
        data: {
          empresa_id: empresa.id,
          empresaevento_id: enrollment.id,
          usuario_id: usuario.id,
          cargo: responsible.cargo || 'Responsable',
          esResponsable: 1,
          estaActivo: 1,
        },
      });

      return enrollment.id;
    });

    return { creado: true, empresaEventoId: created, correo };
  }
}
