import type {
  ProfileResetEmail,
  StaffCredentialsNotifierPort,
  TechnicianCredentialsEmail,
} from './application/ports/staff-notifier.port.js';
import type {
  CredentialDelivery,
  EmailClash,
  ProfileRecord,
  StaffRepositoryPort,
  TechnicianRecord,
} from './domain/ports/staff.repository.port.js';
import type { TechnicianAccount } from './domain/services/staff-account.js';

/**
 * In-memory doubles for the staff context. They implement the ports literally
 * so the use-case tests exercise real behaviour without a database.
 */

export const EVENT = { id: 7, nombre: 'Rueda de Negocios', edicion: 'X' };
export const TECHNICIAN_ID = 3;
export const USER_ID = 9;

export function buildTechnician(overrides: Partial<TechnicianRecord> = {}): TechnicianRecord {
  return {
    id: TECHNICIAN_ID,
    nombres: 'Ana',
    apellidoPaterno: 'Perez',
    apellidoMaterno: null,
    correo: 'ana@test.com',
    telefono: '70011223',
    urlFotoPerfil: null,
    rolEvento: 'TECNICO',
    fechaCreacion: new Date('2026-11-01T12:00:00.000Z'),
    ultimoEnvioCredenciales: null,
    estadoUltimoEnvioCredenciales: null,
    errorUltimoEnvioCredenciales: null,
    ...overrides,
  };
}

export function buildProfile(overrides: Partial<ProfileRecord> = {}): ProfileRecord {
  return {
    id: USER_ID,
    nombres: 'Ana',
    apellidoPaterno: 'Perez',
    apellidoMaterno: 'Lopez',
    correo: 'ana@test.com',
    telefono: '70011223',
    urlFotoPerfil: null,
    rolEvento: 'ADMINISTRADOR',
    ...overrides,
  };
}

export function buildTechnicianBody(overrides: Record<string, unknown> = {}) {
  return {
    nombres: 'Ana',
    apellidoPaterno: 'Perez',
    correo: 'ana@test.com',
    telefono: '70011223',
    ...overrides,
  };
}

export interface FakeStaffOptions {
  event?: { id: number; nombre: string; edicion: string } | null;
  technicians?: TechnicianRecord[];
  technician?: TechnicianRecord | null;
  emailClash?: EmailClash | null;
  phoneTaken?: boolean;
  deactivated?: { id: number } | null;
  profile?: ProfileRecord | null;
  currentPassword?: string | null;
}

export class FakeStaffRepository implements StaffRepositoryPort {
  readonly created: { account: TechnicianAccount; hashedPassword: string }[] = [];
  readonly reactivated: { technicianId: number; hashedPassword: string }[] = [];
  readonly updated: { technicianId: number; account: TechnicianAccount }[] = [];
  readonly deactivatedIds: number[] = [];
  readonly passwords: { userId: number; hashedPassword: string }[] = [];
  readonly deliveries: { userId: number; delivery: CredentialDelivery }[] = [];
  readonly profiles: { userId: number; profile: Record<string, unknown> }[] = [];

  constructor(private readonly options: FakeStaffOptions = {}) {}

  async findPrincipalEvent() {
    return this.options.event === undefined ? EVENT : this.options.event;
  }

  async listTechnicians(): Promise<TechnicianRecord[]> {
    return this.options.technicians ?? [buildTechnician()];
  }

  async findTechnician(): Promise<TechnicianRecord | null> {
    return this.options.technician === undefined ? buildTechnician() : this.options.technician;
  }

  async findEmailClash(): Promise<EmailClash | null> {
    return this.options.emailClash ?? null;
  }

  async isPhoneTaken(): Promise<boolean> {
    return this.options.phoneTaken ?? false;
  }

  async findDeactivatedTechnician(): Promise<{ id: number } | null> {
    return this.options.deactivated ?? null;
  }

  async createTechnician(
    account: TechnicianAccount,
    hashedPassword: string,
  ): Promise<TechnicianRecord> {
    this.created.push({ account, hashedPassword });
    return buildTechnician({ nombres: account.nombres, correo: account.correo });
  }

  async reactivateTechnician(
    technicianId: number,
    account: TechnicianAccount,
    hashedPassword: string,
  ): Promise<TechnicianRecord> {
    this.reactivated.push({ technicianId, hashedPassword });
    return buildTechnician({ id: technicianId, correo: account.correo });
  }

  async updateTechnician(
    technicianId: number,
    account: TechnicianAccount,
  ): Promise<TechnicianRecord> {
    this.updated.push({ technicianId, account });
    return buildTechnician({ id: technicianId, ...account });
  }

  async deactivateTechnician(technicianId: number): Promise<void> {
    this.deactivatedIds.push(technicianId);
  }

  async setPassword(userId: number, hashedPassword: string): Promise<void> {
    this.passwords.push({ userId, hashedPassword });
  }

  async recordCredentialDelivery(userId: number, delivery: CredentialDelivery): Promise<void> {
    this.deliveries.push({ userId, delivery });
  }

  async currentPasswordOf(): Promise<string | null> {
    return this.options.currentPassword === undefined
      ? '$2b$10$previous'
      : this.options.currentPassword;
  }

  async findProfile(): Promise<ProfileRecord | null> {
    return this.options.profile === undefined ? buildProfile() : this.options.profile;
  }

  async updateProfile(userId: number, profile: Record<string, unknown>): Promise<ProfileRecord> {
    this.profiles.push({ userId, profile });
    return buildProfile({ id: userId, correo: String(profile.correo) });
  }
}

export class FakeStaffCredentialsNotifier implements StaffCredentialsNotifierPort {
  readonly technicians: TechnicianCredentialsEmail[] = [];
  readonly resets: ProfileResetEmail[] = [];
  fails = false;

  async sendTechnicianCredentials(email: TechnicianCredentialsEmail): Promise<void> {
    if (this.fails) throw new Error('mail server down');
    this.technicians.push(email);
  }

  async sendProfileReset(email: ProfileResetEmail): Promise<void> {
    if (this.fails) throw new Error('mail server down');
    this.resets.push(email);
  }
}
