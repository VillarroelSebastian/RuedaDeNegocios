import { Inject, Injectable } from '@nestjs/common';
import { CLOCK_PORT, type ClockPort } from '../../../../shared/application/ports/clock.port.js';
import { ENV } from '../../../../shared/config/env.module.js';
import type { Env } from '../../../../shared/config/env.schema.js';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../../../shared/domain/errors/domain.error.js';
import { attendanceDayFor } from '../../../asistencias/domain/services/attendance-window.js';
import { DAILY_ATTENDANCE_LIMIT } from '../../../asistencias/domain/services/daily-limit.js';
import {
  SPONSORS_REPOSITORY,
  type SponsorAttendanceRecord,
  type SponsorPersonDetail,
  type SponsorsRepositoryPort,
} from '../../domain/ports/sponsors.repository.port.js';
import { isValidSponsorCredentialToken } from '../../domain/services/sponsor-credential-token.js';

/**
 * Some QR readers emit the same code twice in a row. A scan repeated inside
 * this window is the same arrival, not a second one.
 */
const DUPLICATE_SCAN_WINDOW_MS = 60_000;

const INVALID = 'Credencial inválida o alterada';
const NOT_CURRENT = 'Credencial no vigente';

export interface SponsorCredentialView {
  tipo: 'AUSPICIADOR';
  personaId: number;
  nombreCompleto: string;
  cargo: string | null;
  empresa: string;
  evento: string;
  edicion: string;
  lugar: string;
  habilitado: boolean;
}

export interface SponsorAttendanceStatus {
  registrada: boolean;
  usosHoy: number;
  usosRestantes: number;
  limiteDiario: number;
  fechaHoraAsistencia?: Date;
}

export interface SponsorCredentialCheck extends SponsorCredentialView {
  asistencia: SponsorAttendanceStatus;
}

export interface SponsorAttendanceResult {
  yaRegistrada: boolean;
  fechaHoraAsistencia: Date;
  usosHoy: number;
  usosRestantes: number;
  limiteDiario: number;
  participante: { nombre: string; empresa: string; cargo: string | null };
  lugar: string;
}

function placeOf(person: SponsorPersonDetail): string {
  return [person.event.ciudadEvento, person.event.paisEvento].filter(Boolean).join(', ');
}

function toCredential(person: SponsorPersonDetail): SponsorCredentialView {
  return {
    tipo: 'AUSPICIADOR',
    personaId: person.id,
    nombreCompleto: person.nombreCompleto,
    cargo: person.cargo,
    empresa: person.nombreEmpresa,
    evento: person.event.nombre,
    edicion: person.event.edicion,
    lugar: placeOf(person),
    habilitado: true,
  };
}

@Injectable()
abstract class SponsorCredentialUseCase {
  constructor(
    @Inject(SPONSORS_REPOSITORY) protected readonly sponsors: SponsorsRepositoryPort,
    @Inject(ENV) protected readonly env: Env,
  ) {}

  /** The signed link is the only credential here: the badge is public. */
  protected async requirePerson(
    personId: number,
    token: unknown,
  ): Promise<SponsorPersonDetail> {
    const candidate = typeof token === 'string' ? token : '';
    if (!isValidSponsorCredentialToken(personId, candidate, this.env.JWT_SECRET)) {
      throw new ForbiddenError(INVALID);
    }

    const person = await this.sponsors.findPerson(personId);
    if (!person) throw new NotFoundError(NOT_CURRENT);

    return person;
  }
}

/** The badge itself, opened by whoever scans the QR. */
@Injectable()
export class ReadSponsorCredentialUseCase extends SponsorCredentialUseCase {
  async execute(personId: number, token: unknown): Promise<SponsorCredentialView> {
    return toCredential(await this.requirePerson(personId, token));
  }
}

/**
 * What the event team sees before deciding to let somebody in: the badge plus
 * how much of today's allowance the person has already used.
 */
@Injectable()
export class CheckSponsorCredentialUseCase extends SponsorCredentialUseCase {
  constructor(
    @Inject(SPONSORS_REPOSITORY) sponsors: SponsorsRepositoryPort,
    @Inject(ENV) env: Env,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
  ) {
    super(sponsors, env);
  }

  async execute(
    personId: number,
    token: unknown,
    technicianEventId: number | null,
  ): Promise<SponsorCredentialCheck> {
    const person = await this.requirePerson(personId, token);
    assertSameEvent(person, technicianEventId);

    const { attendanceDate } = attendanceDayFor(person.event, this.clock.now());
    const usosHoy = await this.sponsors.countAttendanceOn(
      person.event.id,
      personId,
      attendanceDate,
    );
    const last = await this.sponsors.findRecentAttendance(
      person.event.id,
      personId,
      attendanceDate,
      new Date(0),
    );

    return {
      ...toCredential(person),
      asistencia: {
        registrada: usosHoy >= DAILY_ATTENDANCE_LIMIT,
        usosHoy,
        usosRestantes: Math.max(0, DAILY_ATTENDANCE_LIMIT - usosHoy),
        limiteDiario: DAILY_ATTENDANCE_LIMIT,
        ...(last ? { fechaHoraAsistencia: last.fechaHoraAsistencia } : {}),
      },
    };
  }
}

/** Records that the person walked in. */
@Injectable()
export class RecordSponsorAttendanceUseCase extends SponsorCredentialUseCase {
  constructor(
    @Inject(SPONSORS_REPOSITORY) sponsors: SponsorsRepositoryPort,
    @Inject(ENV) env: Env,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
  ) {
    super(sponsors, env);
  }

  async execute(input: {
    personId: number;
    token: unknown;
    technicianId: number;
    technicianEventId: number | null;
  }): Promise<SponsorAttendanceResult> {
    const person = await this.requirePerson(input.personId, input.token);
    assertSameEvent(person, input.technicianEventId);

    const now = this.clock.now();
    const { attendanceDate } = attendanceDayFor(person.event, now);

    const recorded = await this.sponsors.recordAttendance({
      eventId: person.event.id,
      personId: input.personId,
      technicianId: input.technicianId,
      day: attendanceDate,
      graceSince: new Date(now.getTime() - DUPLICATE_SCAN_WINDOW_MS),
    });

    return {
      yaRegistrada: recorded.duplicada,
      fechaHoraAsistencia: recorded.fechaHoraAsistencia,
      usosHoy: recorded.usosHoy,
      usosRestantes: Math.max(0, DAILY_ATTENDANCE_LIMIT - recorded.usosHoy),
      limiteDiario: DAILY_ATTENDANCE_LIMIT,
      participante: {
        nombre: person.nombreCompleto,
        empresa: person.nombreEmpresa,
        cargo: person.cargo,
      },
      lugar: placeOf(person),
    };
  }
}

/** A badge belongs to one event; a reader of another event must not honour it. */
function assertSameEvent(person: SponsorPersonDetail, technicianEventId: number | null): void {
  if (technicianEventId && person.event.id !== technicianEventId) {
    throw new ConflictError('La credencial pertenece a otro evento.');
  }
}

const ATTENDANCE_PAGE = 200;

@Injectable()
export class ListSponsorAttendanceUseCase {
  constructor(
    @Inject(SPONSORS_REPOSITORY) private readonly sponsors: SponsorsRepositoryPort,
  ) {}

  async execute(eventId: number | null): Promise<SponsorAttendanceRecord[]> {
    const event = eventId ?? (await this.sponsors.findPrincipalEvent())?.id;
    return event ? this.sponsors.listAttendance(event, ATTENDANCE_PAGE) : [];
  }
}
