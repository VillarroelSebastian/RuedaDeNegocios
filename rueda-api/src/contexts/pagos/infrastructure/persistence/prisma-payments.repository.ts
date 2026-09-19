import { Injectable } from '@nestjs/common';
import { ConflictError } from '../../../../shared/domain/errors/domain.error.js';
import { PrismaService } from '../../../../shared/infrastructure/persistence/prisma.service.js';
import type { CapacitySource } from '../../../participantes/domain/services/participant-capacity.js';
import type {
  ApprovedEnrollment,
  EnrollmentContact,
  PaginatedPayments,
  PaymentListFilters,
  PaymentsRepositoryPort,
  TopUpQuote,
  TopUpRequest,
  TopUpUnderReview,
} from '../../domain/ports/payments.repository.port.js';
import { companyCodeFor } from '../../domain/services/company-code.js';

/** States an approval may be claimed from, including a re-approval. */
const CLAIMABLE = ['PENDIENTE', 'OBSERVADO', 'COMPLETADO'];

@Injectable()
export class PrismaPaymentsRepository implements PaymentsRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  private async principalEventId(): Promise<number | null> {
    const evento = await this.prisma.evento.findFirst({
      where: { esPrincipal: 1, estaActivo: { not: 0 } },
      select: { id: true },
    });
    return evento?.id ?? null;
  }

  async list(filters: PaymentListFilters): Promise<PaginatedPayments> {
    const eventoId = await this.principalEventId();
    const where = {
      estaActivo: 1,
      ...(eventoId ? { evento_id: eventoId } : {}),
      ...(filters.estado ? { estadoVerificacionPago: filters.estado } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.empresaevento.findMany({
        where,
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        // Most recently submitted first; enrollments with no receipt yet fall
        // back to their creation date. This serves both the review queue and
        // the full list, which the legacy API ordered differently per endpoint.
        orderBy: [{ fechaHoraEnvioComprobante: { sort: 'desc', nulls: 'last' } }, { fechaCreacion: 'desc' }],
        include: {
          empresa: { include: { ciudad: true } },
          evento: true,
          empresaeventocomprobantes: { where: { estaActivo: 1 } },
        },
      }),
      this.prisma.empresaevento.count({ where }),
    ]);

    return { data, total, page: filters.page, limit: filters.limit };
  }

  async findEnrollment(companyEventId: number): Promise<unknown> {
    return this.prisma.empresaevento.findUnique({
      where: { id: companyEventId },
      include: {
        empresa: { include: { ciudad: true } },
        evento: true,
        empresaeventocomprobantes: { where: { estaActivo: 1 } },
        empresa_usuario: { include: { usuario: true } },
      },
    });
  }

  async approveEnrollment(companyEventId: number): Promise<ApprovedEnrollment> {
    const enrollment = await this.prisma.$transaction(
      async (tx) => {
        // Claiming the row first makes a second concurrent approval fail
        // instead of both proceeding to mint credentials.
        const claimed = await tx.empresaevento.updateMany({
          where: {
            id: companyEventId,
            estadoVerificacionPago: { in: CLAIMABLE },
            estaActivo: 1,
          },
          data: { estadoVerificacionPago: 'PROCESANDO' },
        });
        if (claimed.count !== 1) {
          throw new ConflictError('El pago ya fue procesado o no está disponible.');
        }

        const approved = await tx.empresaevento.update({
          where: { id: companyEventId },
          data: {
            estadoVerificacionPago: 'COMPLETADO',
            estadoHabilitacionAcceso: 'HABILITADO',
            fechaHoraVerificacionPago: new Date(),
            observacionSobreComprobante: null,
          },
          include: {
            evento: true,
            empresa: true,
            empresa_usuario: { include: { usuario: true } },
          },
        });

        await tx.empresaeventocomprobantes.updateMany({
          where: { empresaEvento_id: companyEventId, tipoPago: 'INICIAL', estaActivo: 1 },
          data: { estadoPago: 'COMPLETADO' },
        });

        return approved;
      },
      { isolationLevel: 'Serializable' },
    );

    const active = enrollment.empresa_usuario.filter((member) => member.estaActivo !== 0);
    const members = await Promise.all(
      active.map(async (member) => {
        // A person taking part with another company keeps their password.
        const otherEnrollments = await this.prisma.empresa_usuario.count({
          where: { usuario_id: member.usuario_id, id: { not: member.id } },
        });

        return {
          companyUserId: member.id,
          userId: member.usuario_id,
          nombres: member.nombresEvento || member.usuario.nombres || '',
          apellidoPaterno: member.apellidoPaternoEvento || member.usuario.apellidoPaterno || '',
          correo: member.usuario.correo,
          esResponsable: member.esResponsable === 1,
          reusedAccount: otherEnrollments > 0,
        };
      }),
    );

    return {
      companyEventId: enrollment.id,
      companyId: enrollment.empresa.id,
      companyName: enrollment.empresa.nombre,
      companyCode: enrollment.empresa.codigo,
      eventName: enrollment.evento?.nombre ?? null,
      members,
    };
  }

  async observeEnrollment(
    companyEventId: number,
    observacion: string,
  ): Promise<EnrollmentContact | null> {
    return this.updateAndContact(companyEventId, {
      estadoVerificacionPago: 'OBSERVADO',
      estadoHabilitacionAcceso: 'NO_HABILITADO',
      observacionSobreComprobante: observacion,
    });
  }

  async rejectEnrollment(
    companyEventId: number,
    motivo: string,
  ): Promise<EnrollmentContact | null> {
    return this.updateAndContact(companyEventId, {
      estadoVerificacionPago: 'RECHAZADO',
      estadoHabilitacionAcceso: 'NO_HABILITADO',
      motivoRechazoAcceso: motivo,
      observacionSobreComprobante: motivo,
    });
  }

  private async updateAndContact(
    companyEventId: number,
    data: Record<string, unknown>,
  ): Promise<EnrollmentContact | null> {
    const exists = await this.prisma.empresaevento.findUnique({
      where: { id: companyEventId },
      select: { id: true },
    });
    if (!exists) return null;

    const updated = await this.prisma.empresaevento.update({
      where: { id: companyEventId },
      data,
      include: {
        empresa: true,
        evento: true,
        empresa_usuario: {
          where: { esResponsable: 1 },
          include: {
            usuario: { select: { nombres: true, apellidoPaterno: true, correo: true } },
          },
        },
      },
    });

    const responsible = updated.empresa_usuario[0];
    if (!responsible) return null;

    return {
      companyEventId: updated.id,
      companyName: updated.empresa.nombre,
      eventName: updated.evento?.nombre ?? null,
      nombres: responsible.nombresEvento || responsible.usuario.nombres,
      apellidoPaterno: responsible.apellidoPaternoEvento || responsible.usuario.apellidoPaterno,
      correo: responsible.usuario.correo,
    };
  }

  async ensureCompanyCode(companyId: number, currentCode: string | null): Promise<string> {
    if (currentCode) return currentCode;

    const company = await this.prisma.empresa.findUnique({
      where: { id: companyId },
      select: { nombre: true },
    });

    let attempt = 0;
    let code = companyCodeFor(company?.nombre ?? '', companyId);
    while (
      await this.prisma.empresa.findFirst({
        where: { codigo: code, NOT: { id: companyId } },
        select: { id: true },
      })
    ) {
      attempt += 1;
      code = companyCodeFor(company?.nombre ?? '', companyId, attempt);
    }

    await this.prisma.empresa.update({ where: { id: companyId }, data: { codigo: code } });
    return code;
  }

  async setPassword(userId: number, hashedPassword: string): Promise<void> {
    await this.prisma.usuario.update({
      where: { id: userId },
      data: { contrasenia: hashedPassword, creadoModificadoFecha: new Date() },
    });
  }

  async quoteTopUp(companyEventId: number, extraSlots: number): Promise<TopUpQuote | null> {
    const enrollment = await this.prisma.empresaevento.findFirst({
      where: { id: companyEventId, estaActivo: 1 },
      include: {
        evento: {
          include: { eventoreglaqr: { where: { estadoActivo: 1 }, orderBy: { rangoDesde: 'asc' } } },
        },
        paquete: true,
      },
    });
    if (!enrollment) return null;

    const total = enrollment.numeroParticipantes + extraSlots;
    // The rule is matched on the resulting total first, then on the extra
    // slots alone, so a company that already paid lands in the right band.
    const rules = enrollment.evento.eventoreglaqr;
    const rule =
      rules.find((item) => total >= item.rangoDesde && total <= item.rangoHasta) ??
      rules.find((item) => extraSlots >= item.rangoDesde && extraSlots <= item.rangoHasta);

    return {
      cantidad: extraSlots,
      total,
      urlQR: rule?.urlQR || enrollment.paquete?.urlQR || null,
      monto: Number(enrollment.evento.costoParticipanteExtra) * extraSlots,
    };
  }

  async findCapacity(companyEventId: number): Promise<CapacitySource | null> {
    const enrollment = await this.prisma.empresaevento.findFirst({
      where: { id: companyEventId, estaActivo: 1 },
      include: {
        paquete: {
          select: { maxParticipantes: true, credencialesIncluidas: true, nombre: true },
        },
        evento: { select: { maxParticipantesPorEmpresa: true } },
        empresa_usuario: { where: { estaActivo: 1 }, select: { id: true } },
      },
    });
    if (!enrollment) return null;

    return {
      paidSlots: enrollment.numeroParticipantes,
      usedSlots: enrollment.empresa_usuario.length,
      packageName: enrollment.paquete?.nombre ?? null,
      packageMaxParticipants: enrollment.paquete?.maxParticipantes ?? null,
      packageIncludedCredentials: enrollment.paquete?.credencialesIncluidas ?? null,
      eventMaxPerCompany: enrollment.evento?.maxParticipantesPorEmpresa ?? null,
    };
  }

  async isResponsible(companyEventId: number, userId: number): Promise<boolean> {
    const row = await this.prisma.empresa_usuario.findFirst({
      where: {
        empresaevento_id: companyEventId,
        usuario_id: userId,
        esResponsable: 1,
        estaActivo: 1,
      },
      select: { id: true },
    });
    return row !== null;
  }

  async createTopUp(input: {
    companyEventId: number;
    extraSlots: number;
    amount: number;
    receiptUrl: string;
  }): Promise<{ id: number; montoPago: number }> {
    const created = await this.prisma.empresaeventocomprobantes.create({
      data: {
        empresaEvento_id: input.companyEventId,
        urlComprobantePagoInscripcion: input.receiptUrl,
        tipoPago: 'ADICIONAL',
        cantidadParticipantes: input.extraSlots,
        montoPago: input.amount,
        estadoPago: 'PENDIENTE',
        estaActivo: 1,
      },
    });
    return { id: created.id, montoPago: Number(created.montoPago) };
  }

  async listTopUpsOf(companyEventId: number): Promise<TopUpRequest[]> {
    const rows = await this.prisma.empresaeventocomprobantes.findMany({
      where: { empresaEvento_id: companyEventId, estaActivo: 1 },
      orderBy: { fechaCreacion: 'asc' },
    });
    return rows.map(toTopUp);
  }

  async listTopUpsUnderReview(estado?: string): Promise<TopUpUnderReview[]> {
    const eventoId = await this.principalEventId();
    const rows = await this.prisma.empresaeventocomprobantes.findMany({
      where: {
        estaActivo: 1,
        tipoPago: 'ADICIONAL',
        ...(estado ? { estadoPago: estado } : {}),
        ...(eventoId ? { empresaevento: { evento_id: eventoId } } : {}),
      },
      orderBy: { fechaCreacion: 'desc' },
      include: { empresaevento: { include: { empresa: true } } },
    });

    return rows.map((row) => ({
      ...toTopUp(row),
      companyEventId: row.empresaEvento_id,
      empresa: row.empresaevento?.empresa ?? null,
    }));
  }

  async findPendingTopUp(topUpId: number) {
    const row = await this.prisma.empresaeventocomprobantes.findFirst({
      where: { id: topUpId, tipoPago: 'ADICIONAL', estadoPago: 'PENDIENTE' },
      select: { id: true, empresaEvento_id: true, cantidadParticipantes: true },
    });
    if (!row) return null;

    return {
      id: row.id,
      companyEventId: row.empresaEvento_id,
      extraSlots: row.cantidadParticipantes ?? 0,
    };
  }

  async approveTopUp(topUpId: number, companyEventId: number, newTotal: number): Promise<void> {
    await this.prisma.$transaction(
      async (tx) => {
        const claimed = await tx.empresaeventocomprobantes.updateMany({
          where: { id: topUpId, tipoPago: 'ADICIONAL', estadoPago: 'PENDIENTE' },
          data: { estadoPago: 'COMPLETADO' },
        });
        if (claimed.count !== 1) {
          throw new ConflictError('El pago ya fue procesado por otro usuario.');
        }

        await tx.empresaevento.update({
          where: { id: companyEventId },
          data: { numeroParticipantes: newTotal, creadoModificadoFecha: new Date() },
        });
      },
      { isolationLevel: 'Serializable' },
    );
  }

  async findTopUp(topUpId: number) {
    const row = await this.prisma.empresaeventocomprobantes.findFirst({
      where: { id: topUpId, tipoPago: 'ADICIONAL' },
      select: { id: true, empresaEvento_id: true },
    });
    return row ? { id: row.id, companyEventId: row.empresaEvento_id } : null;
  }

  async setTopUpStatus(
    topUpId: number,
    estado: string,
    observacion: string | null,
  ): Promise<void> {
    await this.prisma.empresaeventocomprobantes.update({
      where: { id: topUpId },
      data: { estadoPago: estado, observacion },
    });
  }
}

function toTopUp(row: Record<string, any>): TopUpRequest {
  return {
    id: row.id,
    tipoPago: row.tipoPago,
    cantidadParticipantes: row.cantidadParticipantes,
    montoPago: row.montoPago === null ? null : Number(row.montoPago),
    estadoPago: row.estadoPago,
    observacion: row.observacion,
    urlComprobante: row.urlComprobantePagoInscripcion,
    fechaCreacion: row.fechaCreacion,
  };
}
