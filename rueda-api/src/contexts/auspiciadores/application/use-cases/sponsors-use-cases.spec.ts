import { describe, expect, it } from 'vitest';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../../shared/domain/errors/domain.error.js';
import { FakePasswordHasher, FixedClock } from '../../../auth/test-doubles.js';
import { FixedTemporaryPassword } from '../../../registro/test-doubles.js';
import {
  ENV,
  EVENT,
  type FakeSponsorsOptions,
  FakeSponsorCredentialIssuer,
  FakeSponsorNotifier,
  FakeSponsorsRepository,
  PERSON_ID,
  SECRET,
  SPONSOR_ID,
  buildPersonDetail,
  buildSponsorBody,
} from '../../test-doubles.js';
import { sponsorCredentialTokenFor } from '../../domain/services/sponsor-credential-token.js';
import {
  CreateSponsorUseCase,
  DeleteSponsorUseCase,
  GetSponsorUseCase,
  ListSponsorsUseCase,
  UpdateSponsorUseCase,
} from './manage-sponsors.use-cases.js';
import {
  CheckSponsorCredentialUseCase,
  ListSponsorAttendanceUseCase,
  ReadSponsorCredentialUseCase,
  RecordSponsorAttendanceUseCase,
} from './sponsor-attendance.use-cases.js';

/** During the event, so an attendance scan is inside its days. */
const NOW = new Date('2026-11-10T14:00:00.000Z');
const TOKEN = sponsorCredentialTokenFor(PERSON_ID, SECRET);

function build(options: FakeSponsorsOptions = {}) {
  const repository = new FakeSponsorsRepository(options);
  const credentials = new FakeSponsorCredentialIssuer();
  const notifier = new FakeSponsorNotifier();
  const clock = new FixedClock(NOW);

  return {
    repository,
    credentials,
    notifier,
    list: new ListSponsorsUseCase(repository),
    get: new GetSponsorUseCase(repository),
    create: new CreateSponsorUseCase(
      repository,
      credentials,
      notifier,
      new FakePasswordHasher(),
      new FixedTemporaryPassword(),
    ),
    update: new UpdateSponsorUseCase(repository, credentials, notifier),
    remove: new DeleteSponsorUseCase(repository),
    read: new ReadSponsorCredentialUseCase(repository, ENV),
    check: new CheckSponsorCredentialUseCase(repository, ENV, clock),
    record: new RecordSponsorAttendanceUseCase(repository, ENV, clock),
    attendance: new ListSponsorAttendanceUseCase(repository),
  };
}

describe('CreateSponsorUseCase', () => {
  it('registers the sponsor with its people', async () => {
    const { create, repository } = build();

    await create.execute(buildSponsorBody());

    expect(repository.created[0]?.eventId).toBe(EVENT.id);
    expect(repository.created[0]?.contribution.nombreEmpresa).toBe('Banco Beni');
    expect(repository.created[0]?.people).toHaveLength(1);
  });

  /** Every person of a sponsor walks in, so every one of them gets a badge. */
  it('issues and emails a badge to each person', async () => {
    const { create, credentials, notifier } = build();

    const created = await create.execute(buildSponsorBody());

    expect(credentials.issued).toEqual([PERSON_ID]);
    expect(notifier.credentials[0]?.correo).toBe('ana@test.com');
    expect(notifier.credentials[0]?.eventoNombre).toBe(EVENT.nombre);
    expect(created.correosFallidos).toEqual([]);
  });

  it('reports the people whose badge could not be delivered', async () => {
    const { create, notifier } = build();
    notifier.fails = true;

    const created = await create.execute(buildSponsorBody());

    expect(created.correosFallidos).toEqual(['ana@test.com']);
  });

  it('gives the sponsor an account and emails its temporary password', async () => {
    const { create, repository, notifier } = build();

    const created = await create.execute(buildSponsorBody());

    expect(repository.granted).toHaveLength(1);
    expect(notifier.accesses[0]?.contraseniaTemporal).toBe('Temp123456');
    expect(created.accesoPlataforma.creado).toBe(true);
  });

  /** The password only ever travels by email; it never comes back in a response. */
  it('never hands the temporary password back to the caller', async () => {
    const { create } = build();

    const created = await create.execute(buildSponsorBody());

    expect(created.accesoPlataforma).not.toHaveProperty('contraseniaTemporal');
  });

  it('hashes the password it stores', async () => {
    const { create, repository } = build();

    await create.execute(buildSponsorBody());

    expect(repository.granted[0]?.hashedPassword).not.toBe('Temp123456');
  });

  /** A sponsor already agreed is not undone because an email bounced. */
  it('keeps the sponsor when the account could not be created', async () => {
    const { create } = build({ access: { creado: false, motivo: 'El correo ya tenía una cuenta.' } });

    const created = await create.execute(buildSponsorBody());

    expect(created.accesoPlataforma.creado).toBe(false);
    expect(created.id).toBe(SPONSOR_ID);
  });

  it('refuses an address already in use', async () => {
    const { create } = build({ takenEmail: 'ana@test.com' });

    await expect(create.execute(buildSponsorBody())).rejects.toThrow(
      'El correo "ana@test.com" ya está registrado como usuario o representante de otro auspiciador.',
    );
  });

  it('refuses a list that does not match the entries declared', async () => {
    const { create } = build();

    await expect(
      create.execute(buildSponsorBody({ cantidadIngresos: 3 })),
    ).rejects.toThrow(ValidationError);
  });

  it('refuses while no event is running', async () => {
    const { create } = build({ event: null });

    await expect(create.execute(buildSponsorBody())).rejects.toThrow(
      'No hay un evento principal activo.',
    );
  });
});

describe('UpdateSponsorUseCase', () => {
  /** A badge already handed out, printed or not, is never invalidated. */
  it('issues a badge only to the people that are new', async () => {
    const { update, credentials } = build();

    await update.execute(SPONSOR_ID, buildSponsorBody());

    expect(credentials.issued).toEqual([12]);
  });

  it('refuses a sponsor that is not there', async () => {
    const { update } = build({ sponsor: null });

    await expect(update.execute(404, buildSponsorBody())).rejects.toThrow(NotFoundError);
  });

  it('lets a sponsor keep its own addresses', async () => {
    const { update, repository } = build();

    await update.execute(SPONSOR_ID, buildSponsorBody());

    expect(repository.updated).toHaveLength(1);
  });
});

describe('DeleteSponsorUseCase', () => {
  it('retires the sponsor instead of erasing it', async () => {
    const { remove, repository } = build();

    await remove.execute(SPONSOR_ID);

    expect(repository.deactivated).toEqual([SPONSOR_ID]);
  });

  it('refuses a sponsor of another event', async () => {
    const { remove } = build({ sponsor: null });

    await expect(remove.execute(404)).rejects.toThrow('Auspiciador no encontrado.');
  });
});

describe('ListSponsorsUseCase', () => {
  it('answers with nothing while no event is running', async () => {
    const { list } = build({ event: null });

    expect(await list.execute()).toEqual([]);
  });
});

describe('ReadSponsorCredentialUseCase', () => {
  it('shows the badge behind a genuine link', async () => {
    const { read } = build();

    const credential = await read.execute(PERSON_ID, TOKEN);

    expect(credential.tipo).toBe('AUSPICIADOR');
    expect(credential.empresa).toBe('Banco Beni');
    expect(credential.lugar).toBe('Trinidad, Bolivia');
    expect(credential.habilitado).toBe(true);
  });

  it('refuses a tampered link', async () => {
    const { read } = build();

    await expect(read.execute(PERSON_ID, 'not-the-token')).rejects.toThrow(ForbiddenError);
  });

  /** A token minted for one person must not open another's badge. */
  it('refuses the token of another person', async () => {
    const { read } = build();

    await expect(
      read.execute(PERSON_ID, sponsorCredentialTokenFor(99, SECRET)),
    ).rejects.toThrow('Credencial inválida o alterada');
  });

  it('refuses a credential that is no longer current', async () => {
    const { read } = build({ person: null });

    await expect(read.execute(PERSON_ID, TOKEN)).rejects.toThrow('Credencial no vigente');
  });
});

describe('CheckSponsorCredentialUseCase', () => {
  it('shows how much of today the person has used', async () => {
    const { check } = build({ usosHoy: 1 });

    const checked = await check.execute(PERSON_ID, TOKEN, EVENT.id);

    expect(checked.asistencia).toMatchObject({
      registrada: false,
      usosHoy: 1,
      usosRestantes: 1,
      limiteDiario: 2,
    });
  });

  it('reports a person who already used the whole day', async () => {
    const { check } = build({ usosHoy: 2 });

    expect((await check.execute(PERSON_ID, TOKEN, EVENT.id)).asistencia.registrada).toBe(true);
  });

  /** A badge belongs to one event; a reader of another must not honour it. */
  it('refuses a badge of another event', async () => {
    const { check } = build();

    await expect(check.execute(PERSON_ID, TOKEN, 999)).rejects.toThrow(
      'La credencial pertenece a otro evento.',
    );
  });
});

describe('RecordSponsorAttendanceUseCase', () => {
  const input = { personId: PERSON_ID, token: TOKEN, technicianId: 3, technicianEventId: EVENT.id };

  it('records the arrival and says what is left of the day', async () => {
    const { record } = build();

    const result = await record.execute(input);

    expect(result.yaRegistrada).toBe(false);
    expect(result.usosHoy).toBe(1);
    expect(result.usosRestantes).toBe(1);
    expect(result.participante.empresa).toBe('Banco Beni');
  });

  /** Some readers emit the same code twice; that is one arrival, not two. */
  it('reports a repeated scan as the same arrival', async () => {
    const { record } = build({ duplicada: true });

    expect((await record.execute(input)).yaRegistrada).toBe(true);
  });

  it('refuses a tampered code', async () => {
    const { record } = build();

    await expect(record.execute({ ...input, token: 'nope' })).rejects.toThrow(ForbiddenError);
  });

  it('refuses a badge of another event', async () => {
    const { record } = build();

    await expect(record.execute({ ...input, technicianEventId: 999 })).rejects.toThrow(
      ConflictError,
    );
  });

  it('refuses a scan outside the days of the event', async () => {
    const { repository } = build();
    const useCase = new RecordSponsorAttendanceUseCase(
      repository,
      ENV,
      new FixedClock(new Date('2026-12-25T14:00:00.000Z')),
    );

    await expect(useCase.execute(input)).rejects.toThrow(/asistencia solo puede registrarse/i);
  });

  it('refuses a person whose sponsor is no longer active', async () => {
    const { record } = build({ person: null });

    await expect(record.execute(input)).rejects.toThrow(NotFoundError);
  });

  it('carries the place of the event on the receipt', async () => {
    const { record } = build({ person: buildPersonDetail() });

    expect((await record.execute(input)).lugar).toBe('Trinidad, Bolivia');
  });
});

describe('ListSponsorAttendanceUseCase', () => {
  it('falls back to the running event when the caller has none', async () => {
    const { attendance } = build({ attendance: [] });

    expect(await attendance.execute(null)).toEqual([]);
  });
});
