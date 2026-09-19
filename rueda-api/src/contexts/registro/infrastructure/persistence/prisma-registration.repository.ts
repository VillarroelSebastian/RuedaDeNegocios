import { Injectable } from '@nestjs/common';
import { normalizeEmail, normalizePhone } from '../../../../shared/domain/contact.js';
import { PrismaService } from '../../../../shared/infrastructure/persistence/prisma.service.js';
import { companyCodeFor } from '../../../pagos/domain/services/company-code.js';
import type {
  CityOption,
  KnownAccount,
  KnownCompany,
  RegisteredEnrollment,
  RegisteredParticipant,
  RegistrationData,
  RegistrationEvent,
  RegistrationRepositoryPort,
  TakenPhone,
  TrackedEnrollment,
} from '../../domain/ports/registration.repository.port.js';
import type { RegistrationPackage } from '../../domain/services/enrollment-pricing.js';

/** Prisma hands decimals back as objects; the domain only deals in numbers. */
function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  return typeof value === 'object' && 'toNumber' in value
    ? (value as { toNumber(): number }).toNumber()
    : Number(value);
}

function toNullableNumber(value: unknown): number | null {
  return value === null || value === undefined ? null : toNumber(value);
}

/**
 * A new account without a hash would be stored with an empty password, which
 * the login path must never see. It can only happen through a programming
 * mistake, so it fails loudly instead of writing the row.
 */
function requirePassword(hashedPassword: string | null): string {
  if (!hashedPassword) throw new Error('A new participant account needs a hashed password.');
  return hashedPassword;
}

@Injectable()
export class PrismaRegistrationRepository implements RegistrationRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findPrincipalEvent(): Promise<RegistrationEvent | null> {
    return this.prisma.evento.findFirst({
      where: { esPrincipal: 1, estaActivo: { not: 0 } },
      select: {
        id: true,
        nombre: true,
        fechaInicioSolicitudes: true,
        fechaFinSolicitudes: true,
      },
    });
  }

  async listCities(): Promise<CityOption[]> {
    const rows = await this.prisma.ciudad.findMany({
      include: { pais: true },
      orderBy: { nombre: 'asc' },
    });

    return rows.map((row) => ({
      id: row.id,
      nombre: row.nombre,
      pais: { id: row.pais.id, nombre: row.pais.nombre },
    }));
  }

  async findPackage(eventId: number, packageId: number): Promise<RegistrationPackage | null> {
    const row = await this.prisma.paquete.findFirst({
      where: { id: packageId, evento_id: eventId, estaActivo: 1 },
      select: { id: true, costo: true, credencialesIncluidas: true, tipoParticipacion: true },
    });
    if (!row) return null;

    return {
      id: row.id,
      costo: toNumber(row.costo),
      credencialesIncluidas: row.credencialesIncluidas,
      tipoParticipacion: row.tipoParticipacion,
    };
  }

  async findCompanyByEmail(eventId: number, email: string): Promise<KnownCompany | null> {
    const row = await this.prisma.empresa.findFirst({
      where: { correoCorporativo: { equals: email, mode: 'insensitive' }, estaActivo: 1 },
      select: {
        id: true,
        nombre: true,
        empresaevento: {
          where: { evento_id: eventId, estaActivo: 1 },
          select: { id: true },
        },
      },
    });
    if (!row) return null;

    return { id: row.id, nombre: row.nombre, enrolledInEvent: row.empresaevento.length > 0 };
  }

  async findCompanyByPhone(
    eventId: number,
    telefonoDigits: string,
    exceptCompanyId: number | null,
  ): Promise<{ id: number; nombre: string } | null> {
    // Numbers are stored as typed, so the comparison happens on normalised
    // values rather than in the query.
    const rows = await this.prisma.empresa.findMany({
      where: { estaActivo: 1, empresaevento: { some: { evento_id: eventId, estaActivo: 1 } } },
      select: { id: true, nombre: true, telefonoWhatsapp: true },
    });

    const match = rows.find(
      (row) => row.id !== exceptCompanyId && normalizePhone(row.telefonoWhatsapp) === telefonoDigits,
    );
    return match ? { id: match.id, nombre: match.nombre } : null;
  }

  async findAccountsByEmail(emails: string[], eventId: number): Promise<KnownAccount[]> {
    // An empty `OR` matches every row, which would refuse every registration.
    if (emails.length === 0) return [];

    const rows = await this.prisma.usuario.findMany({
      where: {
        OR: emails.map((correo) => ({ correo: { equals: correo, mode: 'insensitive' as const } })),
      },
      select: {
        id: true,
        correo: true,
        rolEvento: true,
        empresa_usuario: {
          where: { estaActivo: 1, empresaevento: { evento_id: eventId, estaActivo: 1 } },
          select: { id: true },
        },
      },
      // Prefer an enabled account, then the most recent of any duplicates.
      orderBy: [{ estaActivo: 'desc' }, { id: 'desc' }],
    });

    const byEmail = new Map<string, KnownAccount>();
    for (const row of rows) {
      const correo = normalizeEmail(row.correo);
      if (byEmail.has(correo)) continue;
      byEmail.set(correo, {
        id: row.id,
        correo,
        rolEvento: row.rolEvento,
        enrolledInEvent: row.empresa_usuario.length > 0,
      });
    }

    return [...byEmail.values()];
  }

  async listParticipantPhones(eventId: number): Promise<TakenPhone[]> {
    const rows = await this.prisma.empresa_usuario.findMany({
      where: { estaActivo: 1, empresaevento: { evento_id: eventId, estaActivo: 1 } },
      select: { usuario_id: true, telefonoEvento: true, usuario: { select: { telefono: true } } },
    });

    return rows.map((row) => ({
      userId: row.usuario_id,
      telefonoDigits: normalizePhone(row.telefonoEvento || row.usuario.telefono),
    }));
  }

  async isParticipantPhoneTaken(
    eventId: number,
    telefonoDigits: string,
    exceptEmail: string,
  ): Promise<boolean> {
    const rows = await this.prisma.empresa_usuario.findMany({
      where: { estaActivo: 1, empresaevento: { evento_id: eventId, estaActivo: 1 } },
      select: {
        telefonoEvento: true,
        usuario: { select: { correo: true, telefono: true } },
      },
    });

    return rows.some(
      (row) =>
        normalizePhone(row.telefonoEvento || row.usuario.telefono) === telefonoDigits &&
        normalizeEmail(row.usuario.correo) !== exceptEmail,
    );
  }

  async register(data: RegistrationData): Promise<RegisteredEnrollment> {
    return this.prisma.$transaction(
      async (tx) => {
        const now = new Date();
        const { empresa: application, priced } = data;

        const existingCountry = await tx.pais.findFirst({
          where: { nombre: application.paisNombre },
        });
        const country =
          existingCountry ?? (await tx.pais.create({ data: { nombre: application.paisNombre } }));

        const existingCity = await tx.ciudad.findFirst({
          where: { nombre: application.ciudadNombre, pais_id: country.id },
        });
        const city =
          existingCity ??
          (await tx.ciudad.create({
            data: { nombre: application.ciudadNombre, pais_id: country.id },
          }));

        const profile = {
          ciudad_id: city.id,
          nombre: application.nombre,
          rubro: application.rubro,
          sitioWeb: application.sitioWeb,
          descripcion: application.descripcion,
          telefonoWhatsapp: application.telefonoWhatsapp,
          correoCorporativo: application.correoCorporativo,
          oferta: application.oferta,
          demanda: application.demanda,
          interesesBusqueda: application.interesesBusqueda,
          estaActivo: 1,
        };

        // A company taking part in another event keeps its code and its files:
        // the newest registration only refreshes what it actually typed.
        const company = data.existingCompanyId
          ? await tx.empresa.update({
              where: { id: data.existingCompanyId },
              data: { ...profile, creado_modificado_fecha: now },
            })
          : await tx.empresa.create({ data: { ...profile, urlFotoPerfil: '' } });

        const enrollment = await tx.empresaevento.create({
          data: {
            empresa_id: company.id,
            evento_id: data.eventId,
            paquete_id: priced.paqueteId,
            tipoParticipacion: priced.tipoParticipacion,
            estadoHabilitacionAcceso: 'NO_HABILITADO',
            montoPagado: priced.montoPagado,
            estadoVerificacionPago: 'PENDIENTE',
            fechaHoraEnvioComprobante: now,
            numeroParticipantes: priced.numeroParticipantes,
            estaActivo: 1,
          },
        });

        if (data.urlComprobante) {
          await tx.empresaeventocomprobantes.create({
            data: {
              empresaEvento_id: enrollment.id,
              urlComprobantePagoInscripcion: data.urlComprobante,
              estaActivo: 1,
            },
          });
        }

        const participantes: RegisteredParticipant[] = [];
        for (const participant of data.participantes) {
          // The account is global and the enrollment belongs to one event, so a
          // returning person is linked instead of duplicated.
          const usuario = participant.existingUserId
            ? await tx.usuario.update({
                where: { id: participant.existingUserId },
                data: { estaActivo: 1, creadoModificadoFecha: now },
              })
            : await tx.usuario.create({
                data: {
                  nombres: participant.nombres,
                  apellidoPaterno: participant.apellidoPaterno,
                  apellidoMaterno: participant.apellidoMaterno,
                  correo: participant.correo,
                  contrasenia: requirePassword(participant.hashedPassword),
                  telefono: participant.telefono,
                  urlFotoPerfil: participant.urlFotoPerfil,
                  rolEvento: 'EMPRESA',
                  estaActivo: 1,
                },
              });

          const membership = await tx.empresa_usuario.create({
            data: {
              empresa_id: company.id,
              usuario_id: usuario.id,
              empresaevento_id: enrollment.id,
              cargo: participant.cargo,
              esResponsable: participant.esResponsable ? 1 : 0,
              estaActivo: 1,
              nombresEvento: participant.nombres,
              apellidoPaternoEvento: participant.apellidoPaterno,
              apellidoMaternoEvento: participant.apellidoMaterno,
              telefonoEvento: participant.telefono,
            },
          });

          participantes.push({
            companyUserId: membership.id,
            userId: usuario.id,
            nombres: participant.nombres,
            apellidoPaterno: participant.apellidoPaterno,
            correo: participant.correo,
            cargo: participant.cargo,
            esResponsable: participant.esResponsable,
            reutilizado: participant.existingUserId !== null,
          });
        }

        let codigo = company.codigo;
        if (!codigo) {
          let attempt = 0;
          codigo = companyCodeFor(company.nombre, company.id);
          while (
            await tx.empresa.findFirst({
              where: { codigo, NOT: { id: company.id } },
              select: { id: true },
            })
          ) {
            attempt += 1;
            codigo = companyCodeFor(company.nombre, company.id, attempt);
          }
          await tx.empresa.update({ where: { id: company.id }, data: { codigo } });
        }

        return {
          companyEventId: enrollment.id,
          companyId: company.id,
          companyName: company.nombre,
          companyCode: codigo,
          numeroParticipantes: enrollment.numeroParticipantes,
          montoPagado: toNumber(enrollment.montoPagado),
          estadoVerificacionPago: enrollment.estadoVerificacionPago,
          tipoParticipacion: enrollment.tipoParticipacion,
          participantes,
        };
      },
      { isolationLevel: 'Serializable', timeout: 20_000 },
    );
  }

  async findTracking(companyEventId: number): Promise<TrackedEnrollment | null> {
    const row = await this.prisma.empresaevento.findUnique({
      where: { id: companyEventId },
      include: {
        empresa: {
          select: {
            nombre: true,
            rubro: true,
            correoCorporativo: true,
            urlFotoPerfil: true,
          },
        },
        evento: { select: { nombre: true, urlLogoEvento: true } },
        empresaeventocomprobantes: { where: { estaActivo: 1 }, orderBy: { id: 'desc' }, take: 1 },
        empresa_usuario: {
          where: { estaActivo: 1 },
          include: { usuario: { select: { nombres: true, apellidoPaterno: true, correo: true } } },
        },
      },
    });
    if (!row) return null;

    const participantes = row.empresa_usuario.map((membership) => ({
      nombres: membership.usuario.nombres,
      apellidoPaterno: membership.usuario.apellidoPaterno,
      correo: membership.usuario.correo,
      cargo: membership.cargo,
      esResponsable: membership.esResponsable === 1,
    }));
    const inCharge = participantes.find((participant) => participant.esResponsable) ?? null;

    return {
      id: row.id,
      empresa: {
        nombre: row.empresa.nombre,
        rubro: row.empresa.rubro,
        correoCorporativo: row.empresa.correoCorporativo,
        urlFotoPerfil: row.empresa.urlFotoPerfil,
      },
      evento: { nombre: row.evento.nombre, urlLogoEvento: row.evento.urlLogoEvento },
      estadoVerificacionPago: row.estadoVerificacionPago,
      estadoHabilitacionAcceso: row.estadoHabilitacionAcceso,
      observacionSobreComprobante: row.observacionSobreComprobante,
      montoPagado: toNullableNumber(row.montoPagado),
      tipoParticipacion: row.tipoParticipacion,
      numeroParticipantes: row.numeroParticipantes,
      fechaHoraEnvioComprobante: row.fechaHoraEnvioComprobante,
      urlComprobante:
        row.empresaeventocomprobantes[0]?.urlComprobantePagoInscripcion ?? null,
      encargado: inCharge
        ? {
            nombres: inCharge.nombres,
            apellidoPaterno: inCharge.apellidoPaterno,
            correo: inCharge.correo,
          }
        : null,
      participantes,
    };
  }

  async findReceiptTarget(
    companyEventId: number,
  ): Promise<{ id: number; estadoVerificacionPago: string } | null> {
    return this.prisma.empresaevento.findUnique({
      where: { id: companyEventId },
      select: { id: true, estadoVerificacionPago: true },
    });
  }

  async replaceReceipt(companyEventId: number, urlComprobante: string): Promise<void> {
    await this.prisma.$transaction(
      async (tx) => {
        await tx.empresaeventocomprobantes.updateMany({
          where: { empresaEvento_id: companyEventId, estaActivo: 1 },
          data: { estaActivo: 0 },
        });

        await tx.empresaeventocomprobantes.create({
          data: {
            empresaEvento_id: companyEventId,
            urlComprobantePagoInscripcion: urlComprobante,
            estaActivo: 1,
          },
        });

        // The observation stays on file: both the company and the reviewer need
        // to see what the corrected receipt was answering.
        await tx.empresaevento.update({
          where: { id: companyEventId },
          data: { estadoVerificacionPago: 'PENDIENTE', fechaHoraEnvioComprobante: new Date() },
        });
      },
      { isolationLevel: 'Serializable' },
    );
  }
}
