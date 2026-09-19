import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  PASSWORD_HASHER_PORT,
  type PasswordHasherPort,
} from '../../../../shared/application/ports/password-hasher.port.js';
import {
  TEMPORARY_PASSWORD_PORT,
  type TemporaryPasswordPort,
} from '../../../../shared/application/ports/temporary-password.port.js';
import { normalizeEmail, normalizePhone } from '../../../../shared/domain/contact.js';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../../../shared/domain/errors/domain.error.js';
import { STAFF_ROLES } from '../../../../shared/domain/role.js';
import {
  PARTICIPANTS_REPOSITORY,
  type ParticipantsRepositoryPort,
} from '../../domain/ports/participants.repository.port.js';
import { assertSlotAvailable } from '../../domain/services/participant-capacity.js';
import {
  CREDENTIAL_ISSUER_PORT,
  type CredentialIssuerPort,
} from '../../../credenciales/application/ports/credential-issuer.port.js';
import {
  PARTICIPANT_NOTIFIER,
  type ParticipantNotifierPort,
} from '../ports/participant-notifier.port.js';

export interface AddParticipantCommand {
  /** Enrollment of the caller, taken from the token. */
  companyEventId: number;
  /** Caller, taken from the token. */
  userId: number;
  nombres: string;
  apellidoPaterno: string;
  email: string;
  telefono?: string;
  cargo?: string;
}

export interface AddParticipantResult {
  participanteId: number;
  correo: string;
  credencialesEnviadas: boolean;
  /** True when the person already had an account and it was linked instead. */
  reutilizado: boolean;
}

const DEFAULT_ROLE = 'Participante';
const BRAND_GREEN = '449D3A';

@Injectable()
export class AddParticipantUseCase {
  private readonly logger = new Logger(AddParticipantUseCase.name);

  constructor(
    @Inject(PARTICIPANTS_REPOSITORY) private readonly participants: ParticipantsRepositoryPort,
    @Inject(PASSWORD_HASHER_PORT) private readonly hasher: PasswordHasherPort,
    @Inject(TEMPORARY_PASSWORD_PORT) private readonly passwords: TemporaryPasswordPort,
    @Inject(CREDENTIAL_ISSUER_PORT) private readonly credentials: CredentialIssuerPort,
    @Inject(PARTICIPANT_NOTIFIER) private readonly notifier: ParticipantNotifierPort,
  ) {}

  async execute(command: AddParticipantCommand): Promise<AddParticipantResult> {
    const responsible = await this.participants.findResponsibleMembership(
      command.companyEventId,
      command.userId,
    );
    if (!responsible) {
      throw new ForbiddenError('Solo el encargado puede agregar participantes.');
    }

    const enrollment = await this.participants.findGrantedEnrollment(command.companyEventId);
    if (!enrollment) {
      throw new NotFoundError('La inscripción de tu empresa no está habilitada.');
    }
    assertSlotAvailable(enrollment.capacity);

    const email = normalizeEmail(command.email);
    const existing = await this.participants.findAccountByEmail(email, enrollment.eventId);
    if (existing && STAFF_ROLES.includes(existing.rolEvento as never)) {
      throw new ConflictError('Ese correo pertenece a una cuenta interna.');
    }
    if (existing?.enrolledInEvent) {
      throw new ConflictError('Ese correo ya tiene una inscripción en el evento actual.');
    }

    const phone = normalizePhone(command.telefono);
    if (phone) {
      const taken = await this.participants.isPhoneTakenInEvent(
        enrollment.eventId,
        phone,
        existing?.id ?? null,
      );
      if (taken) throw new ConflictError('Ese teléfono ya pertenece a otra cuenta.');
    }

    // Only a brand new account gets a password; a returning person keeps theirs.
    const temporaryPassword = existing ? null : this.passwords.generate();
    const nombres = command.nombres.trim();
    const apellidoPaterno = command.apellidoPaterno.trim();

    const added = await this.participants.addParticipant({
      companyEventId: command.companyEventId,
      companyId: enrollment.companyId,
      existingUserId: existing?.id ?? null,
      nombres,
      apellidoPaterno,
      email,
      telefono: command.telefono?.trim() ?? '',
      cargo: command.cargo?.trim() || DEFAULT_ROLE,
      hashedPassword: temporaryPassword ? await this.hasher.hash(temporaryPassword) : null,
      urlFotoPerfil: avatarUrlFor(nombres, apellidoPaterno),
    });

    // The company is already enabled, so the badge is issued right away. A
    // failure here must not undo a participant who is otherwise registered.
    try {
      await this.credentials.issueFor(added.companyUserId, added.nombreCompleto);
    } catch (error) {
      this.logger.warn(
        `Could not issue the QR badge for membership ${added.companyUserId}: ${String(error)}`,
      );
    }

    const credencialesEnviadas = await this.notifier.sendAccessCredentials(email, temporaryPassword);

    return {
      participanteId: added.companyUserId,
      correo: email,
      credencialesEnviadas,
      reutilizado: Boolean(existing),
    };
  }
}

function avatarUrlFor(nombres: string, apellidoPaterno: string): string {
  const name = `${encodeURIComponent(nombres)}+${encodeURIComponent(apellidoPaterno)}`;
  return `https://ui-avatars.com/api/?name=${name}&background=${BRAND_GREEN}&color=fff&size=128`;
}
