import { describe, expect, it } from 'vitest';
import type { Env } from '../../../../shared/config/env.schema.js';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../../shared/domain/errors/domain.error.js';
import { FixedClock } from '../../../auth/test-doubles.js';
import type { CredentialReaderPort } from '../../../credenciales/application/ports/credential-reader.port.js';
import { credentialTokenFor } from '../../../credenciales/domain/services/credential-token.js';
import { buildCredentialView } from '../../../credenciales/test-doubles.js';
import type {
  AttendanceListFilters,
  AttendanceOutcome,
  AttendanceRepositoryPort,
  RunningEvent,
  ScannedParticipant,
} from '../../domain/ports/attendance.repository.port.js';
import { CheckCredentialUseCase } from './check-credential.use-case.js';
import { ListAttendanceUseCase } from './list-attendance.use-case.js';
import { RecordAttendanceUseCase } from './record-attendance.use-case.js';

const SECRET = 'a-secret-long-enough-for-testing';
const ENV = { JWT_SECRET: SECRET } as Env;
const TOKEN = credentialTokenFor(10, SECRET);
const DURING_EVENT = new Date('2026-11-03T16:00:00.000Z');

const RUNNING: RunningEvent = {
  id: 1,
  startsAt: new Date('2026-11-03T12:00:00.000Z'),
  endsAt: new Date('2026-11-04T22:00:00.000Z'),
};

const PARTICIPANT: ScannedParticipant = {
  companyUserId: 10,
  nombre: 'Ana Perez',
  empresa: 'Beni Agro',
  cargo: 'Gerente',
};

class FakeAttendanceRepository implements AttendanceRepositoryPort {
  recorded: unknown[] = [];
  listFilters: AttendanceListFilters[] = [];

  constructor(
    private readonly options: {
      event?: RunningEvent | null;
      staffEnabled?: boolean;
      participant?: ScannedParticipant | null;
      outcome?: AttendanceOutcome;
      usesToday?: number;
      last?: { id: number; fechaHoraAsistencia: Date } | null;
      rows?: unknown[];
    } = {},
  ) {}

  async findRunningEvent(): Promise<RunningEvent | null> {
    return this.options.event === undefined ? RUNNING : this.options.event;
  }

  async isStaffEnabled(): Promise<boolean> {
    return this.options.staffEnabled ?? true;
  }

  async findGrantedParticipant(): Promise<ScannedParticipant | null> {
    return this.options.participant === undefined ? PARTICIPANT : this.options.participant;
  }

  async recordAttendance(input: unknown): Promise<AttendanceOutcome> {
    this.recorded.push(input);
    return (
      this.options.outcome ?? {
        fechaHoraAsistencia: new Date('2026-11-03T16:00:01.000Z'),
        usesToday: 1,
        duplicate: false,
      }
    );
  }

  async countUsesOn(): Promise<number> {
    return this.options.usesToday ?? 0;
  }

  async findLastUseOn() {
    return this.options.last ?? null;
  }

  async list(_eventId: number, filters: AttendanceListFilters): Promise<unknown[]> {
    this.listFilters.push(filters);
    return this.options.rows ?? [];
  }
}

class FakeCredentialReader implements CredentialReaderPort {
  constructor(private readonly enabled = true) {}

  async read() {
    return buildCredentialView({ habilitado: this.enabled });
  }
}

function buildRecorder(options: ConstructorParameters<typeof FakeAttendanceRepository>[0] = {}) {
  const repository = new FakeAttendanceRepository(options);
  const useCase = new RecordAttendanceUseCase(repository, new FixedClock(DURING_EVENT), ENV);
  return { useCase, repository };
}

describe('RecordAttendanceUseCase', () => {
  const command = { staffUserId: 3, companyUserId: 10, token: TOKEN };

  it('records a scan and reports the remaining allowance', async () => {
    const { useCase } = buildRecorder();

    const result = await useCase.execute(command);

    expect(result).toMatchObject({
      yaRegistrada: false,
      usosHoy: 1,
      usosRestantes: 1,
      limiteDiario: 2,
      participante: { nombre: 'Ana Perez', empresa: 'Beni Agro', cargo: 'Gerente' },
    });
  });

  it('refuses a QR whose signature does not match', async () => {
    const { useCase, repository } = buildRecorder();

    await expect(useCase.execute({ ...command, token: 'tampered' })).rejects.toThrow(
      ValidationError,
    );
    expect(repository.recorded).toEqual([]);
  });

  it('refuses a QR signed for another participant', async () => {
    const { useCase } = buildRecorder();

    await expect(
      useCase.execute({ ...command, token: credentialTokenFor(11, SECRET) }),
    ).rejects.toThrow(/código QR no es válido/);
  });

  it('refuses when no event is running', async () => {
    const { useCase } = buildRecorder({ event: null });

    await expect(useCase.execute(command)).rejects.toThrow(ConflictError);
  });

  it('refuses a scan outside the event days', async () => {
    const repository = new FakeAttendanceRepository();
    const useCase = new RecordAttendanceUseCase(
      repository,
      new FixedClock(new Date('2026-12-01T16:00:00.000Z')),
      ENV,
    );

    await expect(useCase.execute(command)).rejects.toThrow(/durante el evento/);
    expect(repository.recorded).toEqual([]);
  });

  it('refuses a staff account that is no longer enabled', async () => {
    const { useCase } = buildRecorder({ staffEnabled: false });

    await expect(useCase.execute(command)).rejects.toThrow(ForbiddenError);
  });

  it('refuses a participant whose company is not enabled', async () => {
    const { useCase } = buildRecorder({ participant: null });

    await expect(useCase.execute(command)).rejects.toThrow(NotFoundError);
  });

  it('reports a double scan without consuming another use', async () => {
    const { useCase } = buildRecorder({
      outcome: {
        fechaHoraAsistencia: new Date('2026-11-03T16:00:01.000Z'),
        usesToday: 1,
        duplicate: true,
      },
    });

    const result = await useCase.execute(command);

    expect(result.yaRegistrada).toBe(true);
    expect(result.usosHoy).toBe(1);
  });

  it('never reports a negative remaining allowance', async () => {
    const { useCase } = buildRecorder({
      outcome: {
        fechaHoraAsistencia: new Date('2026-11-03T16:00:01.000Z'),
        usesToday: 5,
        duplicate: true,
      },
    });

    expect((await useCase.execute(command)).usosRestantes).toBe(0);
  });
});

describe('CheckCredentialUseCase', () => {
  function buildChecker(
    options: ConstructorParameters<typeof FakeAttendanceRepository>[0] = {},
    enabled = true,
  ) {
    const repository = new FakeAttendanceRepository(options);
    const useCase = new CheckCredentialUseCase(
      repository,
      new FakeCredentialReader(enabled),
      new FixedClock(DURING_EVENT),
    );
    return { useCase };
  }

  it('returns the badge together with today usage', async () => {
    const { useCase } = buildChecker({ usesToday: 1 });

    const result = await useCase.execute(10, TOKEN);

    expect(result.empresa.nombre).toBe('Beni Agro');
    expect(result.asistencia).toMatchObject({
      registrada: false,
      usosHoy: 1,
      usosRestantes: 1,
      limiteDiario: 2,
    });
  });

  it('marks the allowance as spent once the limit is reached', async () => {
    const { useCase } = buildChecker({ usesToday: 2 });

    expect((await useCase.execute(10, TOKEN)).asistencia.registrada).toBe(true);
  });

  it('includes the last scan when there is one', async () => {
    const last = { id: 42, fechaHoraAsistencia: new Date('2026-11-03T14:00:00.000Z') };
    const { useCase } = buildChecker({ usesToday: 1, last });

    expect((await useCase.execute(10, TOKEN)).asistencia).toMatchObject(last);
  });

  it('refuses a participant whose company is not enabled', async () => {
    const { useCase } = buildChecker({}, false);

    await expect(useCase.execute(10, TOKEN)).rejects.toThrow(/no están habilitados/);
  });
});

describe('ListAttendanceUseCase', () => {
  it('lists the caller own scans by default', async () => {
    const repository = new FakeAttendanceRepository({ rows: [{ id: 1 }] });

    const rows = await new ListAttendanceUseCase(repository).execute({ staffUserId: 3 });

    expect(rows).toHaveLength(1);
    expect(repository.listFilters).toEqual([{ staffUserId: 3, companyEventId: undefined }]);
  });

  it('lists a company scans when one is given', async () => {
    const repository = new FakeAttendanceRepository();

    await new ListAttendanceUseCase(repository).execute({ staffUserId: 3, companyEventId: 100 });

    expect(repository.listFilters[0]?.companyEventId).toBe(100);
  });

  it('answers an empty list when no event is running', async () => {
    const repository = new FakeAttendanceRepository({ event: null });

    expect(await new ListAttendanceUseCase(repository).execute({ staffUserId: 3 })).toEqual([]);
  });
});
