import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/persistence/prisma.service.js';
import type {
  CounterpartBrief,
  MessageView,
  MessagesRepositoryPort,
  NewMessage,
} from '../../domain/ports/messages.repository.port.js';
import { EVENT_TEAM, type StoredMessage } from '../../domain/services/message-thread.js';

type Row = Record<string, any>;

function toStored(row: Row): StoredMessage {
  return {
    id: row.id,
    emisorEeId: row.emisorEe_id,
    receptorEeId: row.receptorEe_id,
    contenido: row.contenido,
    haSidoLeido: row.haSidoLeido === 1,
    fechaCreacion: row.fechaCreacion,
  };
}

/** How a message of the event team is signed in the thread. */
function staffAuthorOf(row: Row): string | null {
  if (!row.remitenteRol) return null;

  const role = row.remitenteRol === 'ADMIN' ? 'Organización' : 'Técnico';
  return `${row.remitenteNombre ?? 'Equipo del evento'} · ${role}`;
}

@Injectable()
export class PrismaMessagesRepository implements MessagesRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findPrincipalEventId(): Promise<number | null> {
    const row = await this.prisma.evento.findFirst({
      where: { esPrincipal: 1, estaActivo: { not: 0 } },
      select: { id: true },
    });
    return row?.id ?? null;
  }

  async findGrantedEnrollment(companyEventId: number): Promise<{ id: number } | null> {
    return this.prisma.empresaevento.findFirst({
      where: {
        id: companyEventId,
        estaActivo: 1,
        estadoVerificacionPago: 'COMPLETADO',
        estadoHabilitacionAcceso: 'HABILITADO',
      },
      select: { id: true },
    });
  }

  async findResponsibleMembership(
    companyUserId: number,
    companyEventId: number,
  ): Promise<{ id: number } | null> {
    return this.prisma.empresa_usuario.findFirst({
      where: {
        id: companyUserId,
        empresaevento_id: companyEventId,
        esResponsable: 1,
        estaActivo: 1,
      },
      select: { id: true },
    });
  }

  async listOf(companyEventId: number): Promise<StoredMessage[]> {
    const rows = await this.prisma.mensajeempresa.findMany({
      where: {
        estaActivo: 1,
        OR: [{ emisorEe_id: companyEventId }, { receptorEe_id: companyEventId }],
      },
      // Newest first: the grouping takes the first one it sees of each thread.
      orderBy: { fechaCreacion: 'desc' },
    });
    return rows.map(toStored);
  }

  async findCounterparts(companyEventIds: number[]): Promise<CounterpartBrief[]> {
    if (companyEventIds.length === 0) return [];

    const rows = await this.prisma.empresaevento.findMany({
      where: { id: { in: companyEventIds } },
      select: {
        id: true,
        empresa: { select: { nombre: true, codigo: true, urlFotoPerfil: true } },
      },
    });

    return rows.map((row) => ({
      eeId: row.id,
      nombre: row.empresa.nombre,
      codigo: row.empresa.codigo ?? null,
      urlFotoPerfil: row.empresa.urlFotoPerfil ?? null,
    }));
  }

  async listThread(
    companyEventId: number,
    otherId: number,
    limit: number,
  ): Promise<MessageView[]> {
    const rows = await this.prisma.mensajeempresa.findMany({
      where: {
        estaActivo: 1,
        OR: [
          { emisorEe_id: companyEventId, receptorEe_id: otherId },
          { emisorEe_id: otherId, receptorEe_id: companyEventId },
        ],
      },
      orderBy: { fechaCreacion: 'asc' },
      take: limit,
    });

    const authors = await this.authorsOf(rows);

    return rows.map((row) => ({
      id: row.id,
      esMio: row.emisorEe_id === companyEventId,
      esStaff: row.emisorEe_id === EVENT_TEAM,
      contenido: row.contenido,
      autor:
        staffAuthorOf(row) ??
        (row.empresa_usuario_id ? (authors.get(row.empresa_usuario_id) ?? null) : null),
      fecha: row.fechaCreacion,
    }));
  }

  /** Who wrote each message of a thread, read in one pass. */
  private async authorsOf(rows: Row[]): Promise<Map<number, string>> {
    const ids = [
      ...new Set(
        rows
          .map((row) => row.empresa_usuario_id)
          .filter((id): id is number => typeof id === 'number'),
      ),
    ];
    if (ids.length === 0) return new Map();

    const memberships = await this.prisma.empresa_usuario.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        usuario: { select: { nombres: true, apellidoPaterno: true } },
      },
    });

    return new Map(
      memberships.map((membership) => [
        membership.id,
        `${membership.usuario.nombres} ${membership.usuario.apellidoPaterno}`,
      ]),
    );
  }

  async markThreadRead(companyEventId: number, otherId: number): Promise<void> {
    await this.prisma.mensajeempresa.updateMany({
      where: {
        emisorEe_id: otherId,
        receptorEe_id: companyEventId,
        haSidoLeido: 0,
        estaActivo: 1,
      },
      data: { haSidoLeido: 1, creadoModificadoFecha: new Date() },
    });
  }

  async send(message: NewMessage): Promise<{ id: number; fecha: Date }> {
    const row = await this.prisma.mensajeempresa.create({
      data: {
        evento_id: message.eventId,
        emisorEe_id: message.emisorEeId,
        receptorEe_id: message.receptorEeId,
        empresa_usuario_id: message.companyUserId,
        remitenteRol: message.remitenteRol ?? null,
        remitenteNombre: message.remitenteNombre ?? null,
        contenido: message.contenido,
        haSidoLeido: 0,
        estaActivo: 1,
      },
      select: { id: true, fechaCreacion: true },
    });

    return { id: row.id, fecha: row.fechaCreacion };
  }

  async companyNameOf(companyEventId: number): Promise<string | null> {
    const row = await this.prisma.empresaevento.findUnique({
      where: { id: companyEventId },
      select: { empresa: { select: { nombre: true } } },
    });
    return row?.empresa?.nombre ?? null;
  }

  async findStaffAuthor(
    userId: number,
  ): Promise<{ nombre: string; rolEvento: string } | null> {
    const row = await this.prisma.usuario.findFirst({
      where: { id: userId, estaActivo: 1 },
      select: { nombres: true, apellidoPaterno: true, rolEvento: true },
    });
    if (!row) return null;

    return {
      nombre: `${row.nombres} ${row.apellidoPaterno}`.trim(),
      rolEvento: row.rolEvento,
    };
  }
}
