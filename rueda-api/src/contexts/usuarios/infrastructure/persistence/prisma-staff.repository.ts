import { Injectable } from '@nestjs/common';
import { normalizePhone } from '../../../../shared/domain/contact.js';
import { PrismaService } from '../../../../shared/infrastructure/persistence/prisma.service.js';
import type {
  CredentialDelivery,
  EmailClash,
  ProfileRecord,
  StaffRepositoryPort,
  TechnicianRecord,
} from '../../domain/ports/staff.repository.port.js';
import {
  TECHNICIAN_ROLES,
  type TechnicianAccount,
} from '../../domain/services/staff-account.js';

const TECHNICIAN_SELECT = {
  id: true,
  nombres: true,
  apellidoPaterno: true,
  apellidoMaterno: true,
  correo: true,
  telefono: true,
  urlFotoPerfil: true,
  rolEvento: true,
  fechaCreacion: true,
  ultimoEnvioCredenciales: true,
  estadoUltimoEnvioCredenciales: true,
  errorUltimoEnvioCredenciales: true,
} as const;

const PROFILE_SELECT = {
  id: true,
  nombres: true,
  apellidoPaterno: true,
  apellidoMaterno: true,
  correo: true,
  telefono: true,
  urlFotoPerfil: true,
  rolEvento: true,
} as const;

const ROLES_OF_TECHNICIANS = [...TECHNICIAN_ROLES];

type Row = Record<string, any>;

function toTechnician(row: Row): TechnicianRecord {
  return {
    id: row.id,
    nombres: row.nombres,
    apellidoPaterno: row.apellidoPaterno,
    apellidoMaterno: row.apellidoMaterno,
    correo: row.correo,
    telefono: row.telefono,
    urlFotoPerfil: row.urlFotoPerfil || null,
    rolEvento: row.rolEvento,
    fechaCreacion: row.fechaCreacion,
    ultimoEnvioCredenciales: row.ultimoEnvioCredenciales,
    estadoUltimoEnvioCredenciales: row.estadoUltimoEnvioCredenciales,
    errorUltimoEnvioCredenciales: row.errorUltimoEnvioCredenciales,
  };
}

function toProfile(row: Row): ProfileRecord {
  return {
    id: row.id,
    nombres: row.nombres,
    apellidoPaterno: row.apellidoPaterno,
    apellidoMaterno: row.apellidoMaterno,
    correo: row.correo,
    telefono: row.telefono,
    urlFotoPerfil: row.urlFotoPerfil || null,
    rolEvento: row.rolEvento,
  };
}

function toColumns(account: TechnicianAccount) {
  return {
    nombres: account.nombres,
    apellidoPaterno: account.apellidoPaterno,
    apellidoMaterno: account.apellidoMaterno,
    correo: account.correo,
    telefono: account.telefono,
    rolEvento: account.rolEvento,
    // A technician belongs to the event that is running, which is resolved on
    // every request; pinning one here would freeze them to a past edition.
    evento_id: null,
    ...(account.urlFotoPerfil ? { urlFotoPerfil: account.urlFotoPerfil } : {}),
  };
}

@Injectable()
export class PrismaStaffRepository implements StaffRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findPrincipalEvent(): Promise<{ id: number; nombre: string; edicion: string } | null> {
    return this.prisma.evento.findFirst({
      where: { esPrincipal: 1, estaActivo: { not: 0 } },
      select: { id: true, nombre: true, edicion: true },
    });
  }

  async listTechnicians(): Promise<TechnicianRecord[]> {
    const rows = await this.prisma.usuario.findMany({
      where: { rolEvento: { in: ROLES_OF_TECHNICIANS }, estaActivo: 1 },
      orderBy: { fechaCreacion: 'desc' },
      select: TECHNICIAN_SELECT,
    });
    return rows.map(toTechnician);
  }

  async findTechnician(technicianId: number): Promise<TechnicianRecord | null> {
    const row = await this.prisma.usuario.findFirst({
      where: { id: technicianId, estaActivo: 1, rolEvento: { in: ROLES_OF_TECHNICIANS } },
      select: TECHNICIAN_SELECT,
    });
    return row ? toTechnician(row) : null;
  }

  async findEmailClash(correo: string, exceptUserId: number | null): Promise<EmailClash | null> {
    const rows = await this.prisma.usuario.findMany({
      where: {
        correo: { equals: correo, mode: 'insensitive' },
        ...(exceptUserId ? { id: { not: exceptUserId } } : {}),
      },
      select: { rolEvento: true, estaActivo: true },
    });

    // Somebody of another role owns that address, active or not: it is theirs.
    if (rows.some((row) => !ROLES_OF_TECHNICIANS.includes(row.rolEvento as never))) {
      return 'OTRO_ROL';
    }
    if (rows.some((row) => row.estaActivo === 1)) return 'TECNICO_ACTIVO';

    return null;
  }

  async isPhoneTaken(telefonoDigits: string, exceptUserId: number | null): Promise<boolean> {
    // Numbers are stored as typed, so the comparison happens on normalised
    // values rather than in the query.
    const rows = await this.prisma.usuario.findMany({
      where: { estaActivo: 1, ...(exceptUserId ? { id: { not: exceptUserId } } : {}) },
      select: { telefono: true },
    });

    return rows.some((row) => normalizePhone(row.telefono) === telefonoDigits);
  }

  async findDeactivatedTechnician(correo: string): Promise<{ id: number } | null> {
    return this.prisma.usuario.findFirst({
      where: {
        correo: { equals: correo, mode: 'insensitive' },
        estaActivo: 0,
        rolEvento: { in: ROLES_OF_TECHNICIANS },
      },
      orderBy: { fechaCreacion: 'desc' },
      select: { id: true },
    });
  }

  async createTechnician(
    account: TechnicianAccount,
    hashedPassword: string,
  ): Promise<TechnicianRecord> {
    const row = await this.prisma.usuario.create({
      data: {
        ...toColumns(account),
        urlFotoPerfil: account.urlFotoPerfil ?? '',
        contrasenia: hashedPassword,
        estaActivo: 1,
        creadoModificadoFecha: new Date(),
        estadoUltimoEnvioCredenciales: 'PENDIENTE',
      },
      select: TECHNICIAN_SELECT,
    });
    return toTechnician(row);
  }

  async reactivateTechnician(
    technicianId: number,
    account: TechnicianAccount,
    hashedPassword: string,
  ): Promise<TechnicianRecord> {
    const row = await this.prisma.usuario.update({
      where: { id: technicianId },
      data: {
        ...toColumns(account),
        contrasenia: hashedPassword,
        estaActivo: 1,
        creadoModificadoFecha: new Date(),
        estadoUltimoEnvioCredenciales: 'PENDIENTE',
        errorUltimoEnvioCredenciales: null,
      },
      select: TECHNICIAN_SELECT,
    });
    return toTechnician(row);
  }

  async updateTechnician(
    technicianId: number,
    account: TechnicianAccount,
  ): Promise<TechnicianRecord> {
    const row = await this.prisma.usuario.update({
      where: { id: technicianId },
      data: { ...toColumns(account), creadoModificadoFecha: new Date() },
      select: TECHNICIAN_SELECT,
    });
    return toTechnician(row);
  }

  async deactivateTechnician(technicianId: number): Promise<void> {
    await this.prisma.usuario.update({
      where: { id: technicianId },
      data: { estaActivo: 0, creadoModificadoFecha: new Date() },
    });
  }

  async setPassword(userId: number, hashedPassword: string): Promise<void> {
    await this.prisma.usuario.update({
      where: { id: userId },
      data: { contrasenia: hashedPassword, creadoModificadoFecha: new Date() },
    });
  }

  async recordCredentialDelivery(
    userId: number,
    delivery: CredentialDelivery,
  ): Promise<void> {
    await this.prisma.usuario.update({
      where: { id: userId },
      data: {
        ultimoEnvioCredenciales: delivery.ultimoEnvioCredenciales,
        estadoUltimoEnvioCredenciales: delivery.estadoUltimoEnvioCredenciales,
        errorUltimoEnvioCredenciales: delivery.errorUltimoEnvioCredenciales,
      },
    });
  }

  async currentPasswordOf(userId: number): Promise<string | null> {
    const row = await this.prisma.usuario.findUnique({
      where: { id: userId },
      select: { contrasenia: true },
    });
    return row?.contrasenia ?? null;
  }

  async findProfile(userId: number): Promise<ProfileRecord | null> {
    const row = await this.prisma.usuario.findFirst({
      where: { id: userId, estaActivo: 1 },
      select: PROFILE_SELECT,
    });
    return row ? toProfile(row) : null;
  }

  async updateProfile(
    userId: number,
    profile: {
      nombres: string;
      apellidoPaterno: string;
      apellidoMaterno: string | null;
      correo: string;
      telefono: string;
      urlFotoPerfil: string | null;
      hashedPassword?: string;
    },
  ): Promise<ProfileRecord> {
    const row = await this.prisma.usuario.update({
      where: { id: userId },
      data: {
        nombres: profile.nombres,
        apellidoPaterno: profile.apellidoPaterno,
        apellidoMaterno: profile.apellidoMaterno,
        correo: profile.correo,
        telefono: profile.telefono,
        creadoModificadoFecha: new Date(),
        ...(profile.urlFotoPerfil ? { urlFotoPerfil: profile.urlFotoPerfil } : {}),
        // A new password also retires any reset link that was still in flight.
        ...(profile.hashedPassword
          ? {
              contrasenia: profile.hashedPassword,
              resetToken: null,
              resetTokenExpiry: null,
            }
          : {}),
      },
      select: PROFILE_SELECT,
    });
    return toProfile(row);
  }
}
