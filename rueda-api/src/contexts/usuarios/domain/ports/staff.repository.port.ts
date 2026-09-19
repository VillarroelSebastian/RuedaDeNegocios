import type { CurrentProfile, TechnicianAccount } from '../services/staff-account.js';

/** How the last delivery of credentials to a technician went. */
export interface CredentialDelivery {
  ultimoEnvioCredenciales: Date | null;
  estadoUltimoEnvioCredenciales: string | null;
  errorUltimoEnvioCredenciales: string | null;
}

export interface TechnicianRecord extends CredentialDelivery {
  id: number;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  correo: string;
  telefono: string;
  urlFotoPerfil: string | null;
  rolEvento: string;
  fechaCreacion: Date;
}

export interface ProfileRecord extends CurrentProfile {
  id: number;
  urlFotoPerfil: string | null;
  rolEvento: string;
}

/** Why an address cannot be used for a technician account. */
export type EmailClash = 'OTRO_ROL' | 'TECNICO_ACTIVO';

export interface StaffRepositoryPort {
  findPrincipalEvent(): Promise<{ id: number; nombre: string; edicion: string } | null>;

  listTechnicians(): Promise<TechnicianRecord[]>;
  findTechnician(technicianId: number): Promise<TechnicianRecord | null>;

  /** Whether the address is free for a technician, and why it is not. */
  findEmailClash(correo: string, exceptUserId: number | null): Promise<EmailClash | null>;
  isPhoneTaken(telefonoDigits: string, exceptUserId: number | null): Promise<boolean>;
  /** A technician removed earlier keeps their history and is reactivated. */
  findDeactivatedTechnician(correo: string): Promise<{ id: number } | null>;

  createTechnician(
    account: TechnicianAccount,
    hashedPassword: string,
  ): Promise<TechnicianRecord>;
  reactivateTechnician(
    technicianId: number,
    account: TechnicianAccount,
    hashedPassword: string,
  ): Promise<TechnicianRecord>;
  updateTechnician(
    technicianId: number,
    account: TechnicianAccount,
  ): Promise<TechnicianRecord>;
  deactivateTechnician(technicianId: number): Promise<void>;

  /** Replaces the password and records how the delivery went, in one step. */
  setPassword(userId: number, hashedPassword: string): Promise<void>;
  recordCredentialDelivery(userId: number, delivery: CredentialDelivery): Promise<void>;
  /** The stored hash, so a failed delivery can put the old password back. */
  currentPasswordOf(userId: number): Promise<string | null>;

  findProfile(userId: number): Promise<ProfileRecord | null>;
  updateProfile(
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
  ): Promise<ProfileRecord>;
}

export const STAFF_REPOSITORY = Symbol('StaffRepositoryPort');
