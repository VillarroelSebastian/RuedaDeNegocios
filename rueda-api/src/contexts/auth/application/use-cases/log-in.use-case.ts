import { Inject, Injectable } from '@nestjs/common';
import {
  PASSWORD_HASHER_PORT,
  type PasswordHasherPort,
} from '../../../../shared/application/ports/password-hasher.port.js';
import { UnauthorizedError } from '../../../../shared/domain/errors/domain.error.js';
import { ROLES, TECNICO_ROLES, type Role } from '../../../../shared/domain/role.js';
import type { UserAccount } from '../../domain/entities/user-account.entity.js';
import {
  COMPANY_MEMBERSHIP_REPOSITORY,
  type CompanyMembership,
  type CompanyMembershipRepositoryPort,
} from '../../domain/ports/company-membership.repository.port.js';
import {
  USER_ACCOUNT_REPOSITORY,
  type UserAccountRepositoryPort,
} from '../../domain/ports/user-account.repository.port.js';
import { Email } from '../../domain/value-objects/email.vo.js';
import { TOKEN_SIGNER_PORT, type TokenSignerPort } from '../ports/token-signer.port.js';

export interface LogInCommand {
  email: string;
  password: string;
}

export interface LogInResult {
  token: string;
  id: number;
  email: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  telefono: string;
  role: Role;
  urlFotoPerfil: string;
  assignedEventId: number | null;
  isResponsible?: boolean;
  companyEventId?: number;
  companyUserId?: number;
}

/** Deliberately identical for unknown accounts and wrong passwords. */
const INVALID_CREDENTIALS = 'Credenciales inválidas';

@Injectable()
export class LogInUseCase {
  constructor(
    @Inject(USER_ACCOUNT_REPOSITORY) private readonly users: UserAccountRepositoryPort,
    @Inject(COMPANY_MEMBERSHIP_REPOSITORY)
    private readonly memberships: CompanyMembershipRepositoryPort,
    @Inject(PASSWORD_HASHER_PORT) private readonly hasher: PasswordHasherPort,
    @Inject(TOKEN_SIGNER_PORT) private readonly tokens: TokenSignerPort,
  ) {}

  async execute(command: LogInCommand): Promise<LogInResult> {
    const email = Email.create(command.email);

    const found = await this.users.findActiveByEmail(email.value);
    if (!found) throw new UnauthorizedError(INVALID_CREDENTIALS);

    await this.verifyPassword(found, command.password);

    let account = await this.detachGlobalStaffFromEvent(found);
    let membership: CompanyMembership | undefined;

    if (account.role === ROLES.EMPRESA) {
      membership = await this.assertCompanyMayEnter(account.id);
      account = account.withEventIdentity({
        nombres: membership.nombresEvento,
        apellidoPaterno: membership.apellidoPaternoEvento,
        apellidoMaterno: membership.apellidoMaternoEvento,
        telefono: membership.telefonoEvento,
      });
    }

    const granted = await this.memberships.findGrantedMemberships(account.id);
    const token = await this.tokens.sign({
      sub: account.id,
      role: account.role,
      eventoId: account.assignedEventId,
      eeIds: granted.map((item) => item.companyEventId),
      euIds: granted.map((item) => item.id),
    });

    return {
      token,
      id: account.id,
      email: account.email,
      nombres: account.nombres,
      apellidoPaterno: account.apellidoPaterno,
      apellidoMaterno: account.apellidoMaterno,
      telefono: account.telefono,
      role: account.role,
      urlFotoPerfil: account.urlFotoPerfil,
      assignedEventId: account.assignedEventId,
      ...(membership && {
        isResponsible: membership.isResponsible,
        companyEventId: membership.companyEventId,
        companyUserId: membership.id,
      }),
    };
  }

  /**
   * Accounts predating hashing are compared literally and migrated to bcrypt on
   * the first successful login, so the plaintext row disappears on its own.
   */
  private async verifyPassword(account: UserAccount, candidate: string): Promise<void> {
    if (account.hasLegacyPlaintextPassword()) {
      if (account.storedPassword !== candidate) throw new UnauthorizedError(INVALID_CREDENTIALS);
      await this.users.updatePassword(account.id, await this.hasher.hash(candidate));
      return;
    }

    const matches = await this.hasher.verify(candidate, account.storedPassword);
    if (!matches) throw new UnauthorizedError(INVALID_CREDENTIALS);
  }

  /**
   * The event team is global: the event it operates on is always resolved from
   * the principal event, never from a persisted assignment.
   */
  private async detachGlobalStaffFromEvent(account: UserAccount): Promise<UserAccount> {
    const isGlobalStaff = TECNICO_ROLES.includes(account.role);
    if (!isGlobalStaff || account.assignedEventId === null) return account;

    await this.users.clearAssignedEvent(account.id);
    return account.withoutAssignedEvent();
  }

  private async assertCompanyMayEnter(userId: number): Promise<CompanyMembership> {
    const eventId = await this.memberships.findPrincipalEventId();
    const membership = await this.memberships.findMembershipInEvent(userId, eventId);
    if (!membership) {
      throw new UnauthorizedError(
        'Tu cuenta no está habilitada para el evento actual. Debes registrar tu empresa para participar en este evento.',
      );
    }

    const enrollment = await this.memberships.findEnrollmentStatus(membership.companyEventId);
    if (enrollment?.paymentStatus === 'OBSERVADO') {
      throw new UnauthorizedError(
        'Tu inscripción para el evento actual tiene observaciones pendientes. Revísalas antes de ingresar.',
      );
    }
    if (enrollment?.paymentStatus === 'RECHAZADO') {
      throw new UnauthorizedError(
        'Tu inscripción para el evento actual fue rechazada. Comunícate con el equipo del evento.',
      );
    }
    if (enrollment?.accessStatus !== 'HABILITADO' || enrollment?.paymentStatus !== 'COMPLETADO') {
      throw new UnauthorizedError(
        'Tu inscripción para el evento actual todavía está pendiente de aprobación. Aún no puedes ingresar.',
      );
    }

    return membership;
  }
}
