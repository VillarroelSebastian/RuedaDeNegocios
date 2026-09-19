import { Injectable } from '@nestjs/common';
import { ConflictError } from '../../../../shared/domain/errors/domain.error.js';
import { normalizePhone } from '../../../../shared/domain/contact.js';
import { PrismaService } from '../../../../shared/infrastructure/persistence/prisma.service.js';
import type {
  AddParticipantData,
  AddedParticipant,
  ExistingAccount,
  GrantedEnrollment,
  ParticipantRoster,
  ParticipantsRepositoryPort,
  RosterParticipant,
} from '../../domain/ports/participants.repository.port.js';
import {
  type CapacitySource,
  maxParticipantsOf,
} from '../../domain/services/participant-capacity.js';

const PACKAGE_AND_EVENT = {
  paquete: {
    select: {
      maxParticipantes: true,
      credencialesIncluidas: true,
      nombre: true,
      nivelMesa: true,
    },
  },
  evento: { select: { id: true, maxParticipantesPorEmpresa: true } },
} as const;

@Injectable()
export class PrismaParticipantsRepository implements ParticipantsRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findRoster(companyEventId: number): Promise<ParticipantRoster | null> {
    const row = await this.prisma.empresaevento.findFirst({
      where: { id: companyEventId, estaActivo: 1 },
      include: {
        ...PACKAGE_AND_EVENT,
        empresa_usuario: {
          where: { estaActivo: 1 },
          include: { usuario: true },
          orderBy: { id: 'asc' },
        },
        empresaeventocomprobantes: { where: { estaActivo: 1 }, orderBy: { fechaCreacion: 'asc' } },
      },
    });
    if (!row) return null;

    return {
      capacity: toCapacity(row, row.empresa_usuario.length),
      participantes: row.empresa_usuario.map(toRosterParticipant),
      pagos: row.empresaeventocomprobantes.map((receipt) => ({
        id: receipt.id,
        tipoPago: receipt.tipoPago,
        cantidadParticipantes: receipt.cantidadParticipantes,
        montoPago: toNumber(receipt.montoPago),
        estadoPago: receipt.estadoPago,
        observacion: receipt.observacion,
        urlComprobante: receipt.urlComprobantePagoInscripcion,
        fechaCreacion: receipt.fechaCreacion,
      })),
    };
  }

  async findResponsibleMembership(
    companyEventId: number,
    userId: number,
  ): Promise<{ id: number } | null> {
    return this.prisma.empresa_usuario.findFirst({
      where: {
        empresaevento_id: companyEventId,
        usuario_id: userId,
        esResponsable: 1,
        estaActivo: 1,
      },
      select: { id: true },
    });
  }

  async findGrantedEnrollment(companyEventId: number): Promise<GrantedEnrollment | null> {
    const row = await this.prisma.empresaevento.findFirst({
      where: {
        id: companyEventId,
        estaActivo: 1,
        estadoVerificacionPago: 'COMPLETADO',
        estadoHabilitacionAcceso: 'HABILITADO',
      },
      include: { ...PACKAGE_AND_EVENT, empresa_usuario: { where: { estaActivo: 1 } } },
    });
    if (!row) return null;

    return {
      id: row.id,
      companyId: row.empresa_id,
      eventId: row.evento_id,
      capacity: toCapacity(row, row.empresa_usuario.length),
    };
  }

  async findAccountByEmail(email: string, eventId: number): Promise<ExistingAccount | null> {
    const row = await this.prisma.usuario.findFirst({
      where: { correo: { equals: email, mode: 'insensitive' } },
      include: {
        empresa_usuario: {
          where: { estaActivo: 1, empresaevento: { evento_id: eventId, estaActivo: 1 } },
          select: { id: true },
        },
      },
      // Prefer an enabled account, then the most recent of any duplicates.
      orderBy: [{ estaActivo: 'desc' }, { id: 'desc' }],
    });
    if (!row) return null;

    return {
      id: row.id,
      rolEvento: row.rolEvento,
      enrolledInEvent: row.empresa_usuario.length > 0,
    };
  }

  async isPhoneTakenInEvent(
    eventId: number,
    phone: string,
    exceptUserId: number | null,
  ): Promise<boolean> {
    // Numbers are stored as typed, so the comparison happens on normalised
    // values rather than in the query.
    const rows = await this.prisma.empresa_usuario.findMany({
      where: { estaActivo: 1, empresaevento: { evento_id: eventId, estaActivo: 1 } },
      select: { usuario_id: true, telefonoEvento: true, usuario: { select: { telefono: true } } },
    });

    return rows.some(
      (row) =>
        row.usuario_id !== exceptUserId &&
        normalizePhone(row.telefonoEvento || row.usuario.telefono) === phone,
    );
  }

  async addParticipant(data: AddParticipantData): Promise<AddedParticipant> {
    return this.prisma.$transaction(
      async (tx) => {
        // Re-checked inside the transaction: two concurrent requests must not
        // both take the last slot.
        const used = await tx.empresa_usuario.count({
          where: { empresaevento_id: data.companyEventId, estaActivo: 1 },
        });
        const enrollment = await tx.empresaevento.findUnique({
          where: { id: data.companyEventId },
          include: PACKAGE_AND_EVENT,
        });
        if (!enrollment) throw new ConflictError('La inscripción ya no está disponible.');

        const capacity = toCapacity(enrollment, used);
        if (used >= capacity.paidSlots || used >= maxParticipantsOf(capacity)) {
          throw new ConflictError('No quedan cupos disponibles para agregar otro participante.');
        }

        const usuario = data.existingUserId
          ? await tx.usuario.update({
              where: { id: data.existingUserId },
              data: { estaActivo: 1, creadoModificadoFecha: new Date() },
            })
          : await tx.usuario.create({
              data: {
                nombres: data.nombres,
                apellidoPaterno: data.apellidoPaterno,
                correo: data.email,
                contrasenia: data.hashedPassword!,
                telefono: data.telefono || '+591',
                urlFotoPerfil: data.urlFotoPerfil,
                rolEvento: 'EMPRESA',
                estaActivo: 1,
              },
            });

        const membership = await tx.empresa_usuario.create({
          data: {
            empresa_id: data.companyId,
            usuario_id: usuario.id,
            empresaevento_id: data.companyEventId,
            cargo: data.cargo,
            esResponsable: 0,
            estaActivo: 1,
            nombresEvento: data.nombres,
            apellidoPaternoEvento: data.apellidoPaterno,
            telefonoEvento: data.telefono,
          },
        });

        return {
          companyUserId: membership.id,
          userId: usuario.id,
          nombreCompleto: `${usuario.nombres} ${usuario.apellidoPaterno}`,
        };
      },
      { isolationLevel: 'Serializable' },
    );
  }

  async findRemovableParticipant(
    companyEventId: number,
    companyUserId: number,
  ): Promise<{ id: number; userId: number } | null> {
    const row = await this.prisma.empresa_usuario.findFirst({
      where: {
        id: companyUserId,
        empresaevento_id: companyEventId,
        esResponsable: 0,
        estaActivo: 1,
      },
      select: { id: true, usuario_id: true },
    });
    return row ? { id: row.id, userId: row.usuario_id } : null;
  }

  async deactivateParticipant(companyUserId: number, userId: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.empresa_usuario.update({ where: { id: companyUserId }, data: { estaActivo: 0 } });

      // The account survives while it still belongs to another company, which
      // is what removing someone from one company should mean.
      const stillLinked = await tx.empresa_usuario.findFirst({
        where: { usuario_id: userId, estaActivo: 1 },
      });
      if (!stillLinked) {
        await tx.usuario.update({ where: { id: userId }, data: { estaActivo: 0 } });
      }
    });
  }

  async findActiveParticipantAccount(
    userId: number,
  ): Promise<{ id: number; correo: string } | null> {
    return this.prisma.usuario.findFirst({
      where: { id: userId, estaActivo: 1, empresa_usuario: { some: { estaActivo: 1 } } },
      select: { id: true, correo: true },
    });
  }

  async setPassword(userId: number, hashedPassword: string): Promise<void> {
    await this.prisma.usuario.update({
      where: { id: userId },
      data: { contrasenia: hashedPassword, creadoModificadoFecha: new Date() },
    });
  }
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  return typeof value === 'object' && 'toNumber' in value
    ? (value as { toNumber(): number }).toNumber()
    : Number(value);
}

function toCapacity(row: Record<string, any>, usedSlots: number): CapacitySource {
  return {
    paidSlots: row.numeroParticipantes,
    usedSlots,
    packageName: row.paquete?.nombre ?? null,
    packageMaxParticipants: row.paquete?.maxParticipantes ?? null,
    packageIncludedCredentials: row.paquete?.credencialesIncluidas ?? null,
    eventMaxPerCompany: row.evento?.maxParticipantesPorEmpresa ?? null,
  };
}

function toRosterParticipant(row: Record<string, any>): RosterParticipant {
  return {
    id: row.id,
    esResponsable: row.esResponsable === 1,
    cargo: row.cargo ?? null,
    estaActivo: row.estaActivo,
    usuario: {
      id: row.usuario.id,
      nombres: row.nombresEvento || row.usuario.nombres || '',
      apellidoPaterno: row.apellidoPaternoEvento || row.usuario.apellidoPaterno || '',
      apellidoMaterno: row.apellidoMaternoEvento ?? row.usuario.apellidoMaterno ?? null,
      correo: row.usuario.correo,
      telefono: row.telefonoEvento || row.usuario.telefono || '',
    },
  };
}
