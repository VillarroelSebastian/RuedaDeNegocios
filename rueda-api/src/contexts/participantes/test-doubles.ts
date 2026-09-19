import type { CapacitySource } from './domain/services/participant-capacity.js';
import type { CredentialIssuerPort } from '../credenciales/application/ports/credential-issuer.port.js';
import type { ParticipantNotifierPort } from './application/ports/participant-notifier.port.js';
import type {
  AddParticipantData,
  AddedParticipant,
  ExistingAccount,
  GrantedEnrollment,
  ParticipantRoster,
  ParticipantsRepositoryPort,
} from './domain/ports/participants.repository.port.js';

export function buildCapacity(overrides: Partial<CapacitySource> = {}): CapacitySource {
  return {
    paidSlots: 4,
    usedSlots: 2,
    packageName: 'Paquete Oro',
    packageMaxParticipants: 6,
    packageIncludedCredentials: 4,
    eventMaxPerCompany: 5,
    ...overrides,
  };
}

export function buildEnrollment(overrides: Partial<GrantedEnrollment> = {}): GrantedEnrollment {
  return {
    id: 100,
    companyId: 5,
    eventId: 1,
    capacity: buildCapacity(),
    ...overrides,
  };
}

export class FakeParticipantsRepository implements ParticipantsRepositoryPort {
  added: AddParticipantData[] = [];
  deactivated: { companyUserId: number; userId: number }[] = [];
  passwords: { userId: number; hashedPassword: string }[] = [];
  phoneChecks: { eventId: number; phone: string; exceptUserId: number | null }[] = [];

  constructor(
    private readonly options: {
      roster?: ParticipantRoster | null;
      responsible?: { id: number } | null;
      enrollment?: GrantedEnrollment | null;
      account?: ExistingAccount | null;
      phoneTaken?: boolean;
      removable?: { id: number; userId: number } | null;
      activeAccount?: { id: number; correo: string } | null;
    } = {},
  ) {}

  async findRoster(): Promise<ParticipantRoster | null> {
    return this.options.roster ?? null;
  }

  async findResponsibleMembership(): Promise<{ id: number } | null> {
    return this.options.responsible ?? null;
  }

  async findGrantedEnrollment(): Promise<GrantedEnrollment | null> {
    return this.options.enrollment ?? null;
  }

  async findAccountByEmail(): Promise<ExistingAccount | null> {
    return this.options.account ?? null;
  }

  async isPhoneTakenInEvent(
    eventId: number,
    phone: string,
    exceptUserId: number | null,
  ): Promise<boolean> {
    this.phoneChecks.push({ eventId, phone, exceptUserId });
    return this.options.phoneTaken ?? false;
  }

  async addParticipant(data: AddParticipantData): Promise<AddedParticipant> {
    this.added.push(data);
    return {
      companyUserId: 55,
      userId: data.existingUserId ?? 77,
      nombreCompleto: `${data.nombres} ${data.apellidoPaterno}`,
    };
  }

  async findRemovableParticipant(): Promise<{ id: number; userId: number } | null> {
    return this.options.removable ?? null;
  }

  async deactivateParticipant(companyUserId: number, userId: number): Promise<void> {
    this.deactivated.push({ companyUserId, userId });
  }

  async findActiveParticipantAccount(): Promise<{ id: number; correo: string } | null> {
    return this.options.activeAccount ?? null;
  }

  async setPassword(userId: number, hashedPassword: string): Promise<void> {
    this.passwords.push({ userId, hashedPassword });
  }
}

export class FakeCredentialIssuer implements CredentialIssuerPort {
  readonly issued: { companyUserId: number; fullName: string }[] = [];
  shouldFail = false;

  async issueFor(companyUserId: number, fullName: string): Promise<string> {
    if (this.shouldFail) throw new Error('QR service unavailable');
    this.issued.push({ companyUserId, fullName });
    return `/uploads/credencial-${companyUserId}.png`;
  }
}

export class FakeParticipantNotifier implements ParticipantNotifierPort {
  readonly sent: { email: string; temporaryPassword: string | null }[] = [];
  delivers = true;

  async sendAccessCredentials(email: string, temporaryPassword: string | null): Promise<boolean> {
    this.sent.push({ email, temporaryPassword });
    return this.delivers;
  }
}
