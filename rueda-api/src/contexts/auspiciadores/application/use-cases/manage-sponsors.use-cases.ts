import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  PASSWORD_HASHER_PORT,
  type PasswordHasherPort,
} from '../../../../shared/application/ports/password-hasher.port.js';
import {
  TEMPORARY_PASSWORD_PORT,
  type TemporaryPasswordPort,
} from '../../../../shared/application/ports/temporary-password.port.js';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../../../shared/domain/errors/domain.error.js';
import {
  SPONSORS_REPOSITORY,
  type PlatformAccess,
  type SponsorEvent,
  type SponsorPerson,
  type SponsorRecord,
  type SponsorsRepositoryPort,
} from '../../domain/ports/sponsors.repository.port.js';
import {
  type SponsorContributionInput,
  sanitizeSponsorContribution,
} from '../../domain/services/sponsor-contribution.js';
import {
  type RepresentativeInput,
  sanitizeRepresentatives,
} from '../../domain/services/sponsor-representatives.js';
import {
  SPONSOR_CREDENTIAL_ISSUER_PORT,
  SPONSOR_NOTIFIER_PORT,
  type SponsorCredentialIssuerPort,
  type SponsorNotifierPort,
} from '../ports/sponsor-credential.port.js';

const NO_EVENT = 'No hay un evento principal activo.';
const NOT_FOUND = 'Auspiciador no encontrado.';

export interface SaveSponsorCommand extends SponsorContributionInput {
  personas?: RepresentativeInput[];
}

export interface CreatedSponsor extends SponsorRecord {
  accesoPlataforma: PlatformAccess;
  /** People whose badge could not be emailed; the sponsor still has theirs. */
  correosFallidos: string[];
}

@Injectable()
abstract class SponsorUseCase {
  constructor(
    @Inject(SPONSORS_REPOSITORY) protected readonly sponsors: SponsorsRepositoryPort,
  ) {}

  protected async currentEvent(): Promise<SponsorEvent> {
    const event = await this.sponsors.findPrincipalEvent();
    if (!event) throw new ValidationError(NO_EVENT);
    return event;
  }

  protected async currentEventId(): Promise<number> {
    return (await this.currentEvent()).id;
  }

  protected async requireSponsor(sponsorId: number): Promise<SponsorRecord> {
    const eventId = await this.currentEventId();

    const sponsor = await this.sponsors.find(sponsorId, eventId);
    if (!sponsor) throw new NotFoundError(NOT_FOUND);

    return sponsor;
  }
}

@Injectable()
export class ListSponsorsUseCase extends SponsorUseCase {
  async execute(): Promise<SponsorRecord[]> {
    const event = await this.sponsors.findPrincipalEvent();
    return event ? this.sponsors.list(event.id) : [];
  }
}

@Injectable()
export class GetSponsorUseCase extends SponsorUseCase {
  execute(sponsorId: number): Promise<SponsorRecord> {
    return this.requireSponsor(sponsorId);
  }
}

/**
 * Registers a sponsor, issues a badge to each of its people and gives the
 * company an account it can use the platform with. Neither the badges nor the
 * account undo the registration if they fail: the sponsor is already agreed.
 */
@Injectable()
export class CreateSponsorUseCase extends SponsorUseCase {
  private readonly logger = new Logger(CreateSponsorUseCase.name);

  constructor(
    @Inject(SPONSORS_REPOSITORY) sponsors: SponsorsRepositoryPort,
    @Inject(SPONSOR_CREDENTIAL_ISSUER_PORT)
    private readonly credentials: SponsorCredentialIssuerPort,
    @Inject(SPONSOR_NOTIFIER_PORT) private readonly notifier: SponsorNotifierPort,
    @Inject(PASSWORD_HASHER_PORT) private readonly hasher: PasswordHasherPort,
    @Inject(TEMPORARY_PASSWORD_PORT) private readonly passwords: TemporaryPasswordPort,
  ) {
    super(sponsors);
  }

  async execute(command: SaveSponsorCommand): Promise<CreatedSponsor> {
    const event = await this.currentEvent();

    const contribution = sanitizeSponsorContribution(command);
    const representatives = sanitizeRepresentatives(
      command.personas ?? [],
      contribution.cantidadIngresos,
    );

    const taken = await this.sponsors.findTakenEmail(
      representatives.map((person) => person.correo),
      null,
    );
    if (taken) {
      throw new ConflictError(
        `El correo "${taken}" ya está registrado como usuario o representante de otro auspiciador.`,
      );
    }

    const sponsor = await this.sponsors.create(event.id, contribution, representatives);

    const correosFallidos = await this.issueBadges(
      sponsor.personas,
      sponsor.nombreEmpresa,
      event.nombre,
    );
    const accesoPlataforma = await this.grantAccess(sponsor);

    return { ...(await this.requireSponsor(sponsor.id)), accesoPlataforma, correosFallidos };
  }

  /** Every person of a sponsor walks in, so every one of them gets a badge. */
  private async issueBadges(
    people: SponsorPerson[],
    nombreEmpresa: string,
    eventoNombre: string,
  ): Promise<string[]> {
    const failed: string[] = [];

    for (const person of people) {
      try {
        const urlCredencialQR = await this.credentials.issueFor(person.id);
        if (person.correo) {
          await this.notifier.sendCredential({
            correo: person.correo,
            nombreCompleto: person.nombreCompleto,
            nombreEmpresa,
            eventoNombre,
            urlCredencialQR,
          });
        }
      } catch (error) {
        this.logger.warn(`Could not deliver the badge of person ${person.id}: ${String(error)}`);
        failed.push(person.correo ?? 'sin correo');
      }
    }

    return failed;
  }

  private async grantAccess(sponsor: SponsorRecord): Promise<PlatformAccess> {
    try {
      const temporaryPassword = this.passwords.generate();
      const access = await this.sponsors.grantPlatformAccess(
        sponsor.id,
        await this.hasher.hash(temporaryPassword),
      );

      if (access.creado && access.correo) {
        await this.notifier.sendPlatformAccess({
          correo: access.correo,
          nombreEmpresa: sponsor.nombreEmpresa,
          contraseniaTemporal: temporaryPassword,
        });
      }

      // The password is never handed back: it only ever travels by email.
      return { creado: access.creado, motivo: access.motivo, empresaEventoId: access.empresaEventoId };
    } catch (error) {
      this.logger.warn(`Could not grant platform access to sponsor ${sponsor.id}: ${String(error)}`);
      return { creado: false, motivo: 'No se pudo enviar el acceso' };
    }
  }
}

@Injectable()
export class UpdateSponsorUseCase extends SponsorUseCase {
  private readonly logger = new Logger(UpdateSponsorUseCase.name);

  constructor(
    @Inject(SPONSORS_REPOSITORY) sponsors: SponsorsRepositoryPort,
    @Inject(SPONSOR_CREDENTIAL_ISSUER_PORT)
    private readonly credentials: SponsorCredentialIssuerPort,
    @Inject(SPONSOR_NOTIFIER_PORT) private readonly notifier: SponsorNotifierPort,
  ) {
    super(sponsors);
  }

  async execute(sponsorId: number, command: SaveSponsorCommand): Promise<SponsorRecord> {
    const event = await this.currentEvent();
    const existing = await this.requireSponsor(sponsorId);

    const contribution = sanitizeSponsorContribution(command);
    const representatives = sanitizeRepresentatives(
      command.personas ?? [],
      contribution.cantidadIngresos,
    );

    const taken = await this.sponsors.findTakenEmail(
      representatives.map((person) => person.correo),
      sponsorId,
    );
    if (taken) {
      throw new ConflictError(
        `El correo "${taken}" ya está registrado como usuario o representante de otro auspiciador.`,
      );
    }

    const { sponsor, nuevas } = await this.sponsors.update(
      sponsorId,
      contribution,
      representatives,
    );

    // People who were already there keep the badge they were handed, printed or
    // not. Only the new ones need one issued.
    for (const person of nuevas) {
      try {
        const urlCredencialQR = await this.credentials.issueFor(person.id);
        if (person.correo) {
          await this.notifier.sendCredential({
            correo: person.correo,
            nombreCompleto: person.nombreCompleto,
            nombreEmpresa: existing.nombreEmpresa,
            eventoNombre: event.nombre,
            urlCredencialQR,
          });
        }
      } catch (error) {
        this.logger.warn(`Could not deliver the badge of person ${person.id}: ${String(error)}`);
      }
    }

    return sponsor;
  }
}

@Injectable()
export class DeleteSponsorUseCase extends SponsorUseCase {
  async execute(sponsorId: number): Promise<void> {
    await this.requireSponsor(sponsorId);
    await this.sponsors.deactivate(sponsorId);
  }
}
