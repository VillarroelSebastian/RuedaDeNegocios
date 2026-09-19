import type { PasswordHasherPort } from '../../shared/application/ports/password-hasher.port.js';
import type { MailMessage, MailerPort } from '../../shared/application/ports/mailer.port.js';
import type { ClockPort } from '../../shared/application/ports/clock.port.js';
import { ROLES, type Role } from '../../shared/domain/role.js';
import type { PasswordResetNotifierPort } from './application/ports/password-reset-notifier.port.js';
import type { AccessTokenClaims, TokenSignerPort } from './application/ports/token-signer.port.js';
import type { VerificationCodeGeneratorPort } from './application/ports/verification-code.port.js';
import { UserAccount, type UserAccountProps } from './domain/entities/user-account.entity.js';
import type {
  CompanyMembership,
  CompanyMembershipRepositoryPort,
  EnrollmentStatus,
} from './domain/ports/company-membership.repository.port.js';
import type {
  ResetRecipient,
  ResetTokenCandidate,
  UserAccountRepositoryPort,
} from './domain/ports/user-account.repository.port.js';

/**
 * In-memory doubles for the auth context. They implement the ports literally so
 * use-case tests exercise real behaviour without a database.
 */

export function buildUserAccount(overrides: Partial<UserAccountProps> = {}): UserAccount {
  return new UserAccount({
    id: 1,
    email: 'empresa@test.com',
    storedPassword: fakeHash('Rueda2026!segura'),
    role: ROLES.EMPRESA,
    assignedEventId: null,
    nombres: 'Ana',
    apellidoPaterno: 'Perez',
    apellidoMaterno: 'Lopez',
    telefono: '70000000',
    urlFotoPerfil: '/uploads/perfil/ana.png',
    ...overrides,
  });
}

export function buildMembership(overrides: Partial<CompanyMembership> = {}): CompanyMembership {
  return {
    id: 10,
    companyEventId: 100,
    isResponsible: true,
    nombresEvento: null,
    apellidoPaternoEvento: null,
    apellidoMaternoEvento: null,
    telefonoEvento: null,
    ...overrides,
  };
}

/**
 * Reversible stand-in for bcrypt. The output keeps the real `$2b$` prefix so
 * `UserAccount.hasLegacyPlaintextPassword()` classifies it the way it would
 * classify a production hash.
 */
export const FAKE_HASH_PREFIX = '$2b$10$';

export function fakeHash(plain: string): string {
  return `${FAKE_HASH_PREFIX}${plain}`;
}

export class FakePasswordHasher implements PasswordHasherPort {
  readonly hashed: string[] = [];

  async hash(plain: string): Promise<string> {
    this.hashed.push(plain);
    return fakeHash(plain);
  }

  async verify(plain: string, hashed: string): Promise<boolean> {
    return hashed === fakeHash(plain);
  }
}

export class FakeUserAccountRepository implements UserAccountRepositoryPort {
  passwordUpdates: { userId: number; hashedPassword: string }[] = [];
  clearedEvents: number[] = [];
  savedResetTokens: { userId: number; hashedCode: string; expiresAt: Date }[] = [];
  completedResets: { userId: number; hashedPassword: string }[] = [];

  constructor(
    private readonly accounts: UserAccount[] = [],
    private readonly recipient: ResetRecipient | null = null,
    private readonly resetCandidates: ResetTokenCandidate[] = [],
  ) {}

  async findActiveByEmail(email: string): Promise<UserAccount | null> {
    return this.accounts.find((account) => account.email === email) ?? null;
  }

  async findActiveById(id: number): Promise<UserAccount | null> {
    return this.accounts.find((account) => account.id === id) ?? null;
  }

  async updatePassword(userId: number, hashedPassword: string): Promise<void> {
    this.passwordUpdates.push({ userId, hashedPassword });
  }

  async clearAssignedEvent(userId: number): Promise<void> {
    this.clearedEvents.push(userId);
  }

  async findLatestActiveRecipientByEmail(): Promise<ResetRecipient | null> {
    return this.recipient;
  }

  async saveResetToken(userId: number, hashedCode: string, expiresAt: Date): Promise<void> {
    this.savedResetTokens.push({ userId, hashedCode, expiresAt });
  }

  async findResetCandidatesByEmail(): Promise<ResetTokenCandidate[]> {
    return this.resetCandidates;
  }

  async completePasswordReset(userId: number, hashedPassword: string): Promise<void> {
    this.completedResets.push({ userId, hashedPassword });
  }
}

export class FakeCompanyMembershipRepository implements CompanyMembershipRepositoryPort {
  constructor(
    private readonly principalEventId: number | null = 100,
    private readonly membership: CompanyMembership | null = null,
    private readonly enrollment: EnrollmentStatus | null = null,
    private readonly granted: { id: number; companyEventId: number }[] = [],
  ) {}

  async findPrincipalEventId(): Promise<number | null> {
    return this.principalEventId;
  }

  async findMembershipInEvent(): Promise<CompanyMembership | null> {
    return this.membership;
  }

  async findEnrollmentStatus(): Promise<EnrollmentStatus | null> {
    return this.enrollment;
  }

  async findGrantedMemberships(): Promise<{ id: number; companyEventId: number }[]> {
    return this.granted;
  }
}

export class FakeTokenSigner implements TokenSignerPort {
  signed: AccessTokenClaims[] = [];

  async sign(claims: AccessTokenClaims): Promise<string> {
    this.signed.push(claims);
    return `token-for-${claims.sub}`;
  }

  async verify(): Promise<AccessTokenClaims> {
    return { sub: 1, role: ROLES.EMPRESA as Role, eventoId: null, eeIds: [], euIds: [] };
  }
}

export class FakeMailer implements MailerPort {
  readonly sent: MailMessage[] = [];

  async send(message: MailMessage): Promise<void> {
    this.sent.push(message);
  }
}

export class FixedClock implements ClockPort {
  constructor(private readonly instant: Date) {}

  now(): Date {
    return new Date(this.instant);
  }
}

export class FakePasswordResetNotifier implements PasswordResetNotifierPort {
  readonly notified: { email: string; nombres: string; code: string }[] = [];

  async sendResetCode(recipient: { email: string; nombres: string }, code: string): Promise<void> {
    this.notified.push({ ...recipient, code });
  }
}

export class FixedVerificationCodeGenerator implements VerificationCodeGeneratorPort {
  constructor(private readonly code = '123456') {}

  generate(): string {
    return this.code;
  }
}
