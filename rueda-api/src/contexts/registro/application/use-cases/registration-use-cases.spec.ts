import { describe, expect, it } from 'vitest';
import type { Env } from '../../../../shared/config/env.schema.js';
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../../../../shared/domain/errors/domain.error.js';
import { FakePasswordHasher, FixedClock } from '../../../auth/test-doubles.js';
import { trackingTokenFor } from '../../../pagos/domain/services/tracking-token.js';
import {
  EVENT,
  FakeRegistrationNotifier,
  type FakeRegistrationOptions,
  FakeRegistrationRepository,
  FixedTemporaryPassword,
  buildCompanyApplicationBody,
  buildParticipantBody,
} from '../../test-doubles.js';
import { CheckAvailabilityUseCase } from './check-availability.use-case.js';
import { ListRegistrationCitiesUseCase } from './list-registration-cities.use-case.js';
import { RegisterCompanyUseCase } from './register-company.use-case.js';
import {
  GetEnrollmentTrackingUseCase,
  ResubmitReceiptUseCase,
} from './track-enrollment.use-cases.js';

const SECRET = 'a-very-long-development-secret-value';
const ENV = { JWT_SECRET: SECRET } as Env;
const NOW = new Date('2026-09-18T12:00:00.000Z');
const COMPANY_EVENT_ID = 100;
const TOKEN = trackingTokenFor(COMPANY_EVENT_ID, SECRET);

function buildRegistrar(options: FakeRegistrationOptions = {}) {
  const repository = new FakeRegistrationRepository(options);
  const notifier = new FakeRegistrationNotifier();
  const hasher = new FakePasswordHasher();
  const useCase = new RegisterCompanyUseCase(
    repository,
    hasher,
    new FixedTemporaryPassword(),
    notifier,
    new FixedClock(NOW),
    ENV,
  );
  return { useCase, repository, notifier, hasher };
}

function buildCommand(overrides: Record<string, unknown> = {}) {
  return {
    empresa: buildCompanyApplicationBody(),
    paqueteId: 3,
    participantes: [buildParticipantBody()],
    ...overrides,
  };
}

describe('RegisterCompanyUseCase', () => {
  it('stores the enrollment and hands back its tracking token', async () => {
    const { useCase, repository } = buildRegistrar();

    const receipt = await useCase.execute(buildCommand());

    expect(receipt.empresaeventoId).toBe(COMPANY_EVENT_ID);
    expect(receipt.seguimientoToken).toBe(TOKEN);
    expect(receipt.inscripcion.estadoVerificacionPago).toBe('PENDIENTE');
    expect(repository.registered).toHaveLength(1);
  });

  it('prices the enrollment from the package, never from the client', async () => {
    const { useCase, repository } = buildRegistrar();

    const receipt = await useCase.execute(
      buildCommand({ empresa: buildCompanyApplicationBody(), montoPagado: 1, numeroParticipantes: 9 }),
    );

    expect(receipt.inscripcion.montoPagado).toBe(1500);
    expect(receipt.inscripcion.numeroParticipantes).toBe(2);
    expect(repository.registered[0]?.priced.tipoParticipacion).toBe('PRESENCIAL');
  });

  it('refuses when no event is taking registrations', async () => {
    const { useCase } = buildRegistrar({ event: null });

    await expect(useCase.execute(buildCommand())).rejects.toThrow(
      'No hay evento activo en este momento.',
    );
  });

  it('refuses once the registration period has closed', async () => {
    const { useCase } = buildRegistrar({
      event: { ...EVENT, fechaFinSolicitudes: new Date('2026-09-17T00:00:00.000Z') },
    });

    await expect(useCase.execute(buildCommand())).rejects.toThrow(ValidationError);
  });

  it('refuses a package the event does not offer', async () => {
    const { useCase } = buildRegistrar({ registrationPackage: null });

    await expect(useCase.execute(buildCommand())).rejects.toThrow(NotFoundError);
  });

  it('refuses a roster larger than the credentials the package includes', async () => {
    const { useCase } = buildRegistrar();

    const command = buildCommand({
      participantes: [
        buildParticipantBody(),
        buildParticipantBody({ correo: 'luis@test.com', telefono: '70099887', esResponsable: false }),
        buildParticipantBody({ correo: 'eva@test.com', telefono: '70055443', esResponsable: false }),
      ],
    });

    await expect(useCase.execute(command)).rejects.toThrow(ValidationError);
  });

  it('refuses a company already enrolled in the event', async () => {
    const { useCase } = buildRegistrar({
      company: { id: 5, nombre: 'Agro Beni SRL', enrolledInEvent: true },
    });

    await expect(useCase.execute(buildCommand())).rejects.toThrow(
      'Esta empresa ya está registrada para el evento actual.',
    );
  });

  it('reuses the company behind a corporate email that is not enrolled yet', async () => {
    const { useCase, repository } = buildRegistrar({
      company: { id: 5, nombre: 'Agro Beni', enrolledInEvent: false },
    });

    await useCase.execute(buildCommand());

    expect(repository.registered[0]?.existingCompanyId).toBe(5);
  });

  it('refuses a WhatsApp number another company of the event already uses', async () => {
    const { useCase } = buildRegistrar({ companyByPhone: { id: 9, nombre: 'Ganadera Beni' } });

    await expect(useCase.execute(buildCommand())).rejects.toThrow(
      'El telefono/WhatsApp ya esta registrado por la empresa "Ganadera Beni".',
    );
  });

  it('refuses an internal account as a participant', async () => {
    const { useCase } = buildRegistrar({
      accounts: [
        { id: 2, correo: 'ana@test.com', rolEvento: 'TECNICO', enrolledInEvent: false },
      ],
    });

    await expect(useCase.execute(buildCommand())).rejects.toThrow(
      'El correo ana@test.com pertenece a una cuenta interna y no puede registrarse como participante.',
    );
  });

  it('refuses a participant already enrolled in the event', async () => {
    const { useCase } = buildRegistrar({
      accounts: [{ id: 2, correo: 'ana@test.com', rolEvento: 'EMPRESA', enrolledInEvent: true }],
    });

    await expect(useCase.execute(buildCommand())).rejects.toThrow(
      'El correo ana@test.com ya esta registrado en el evento actual.',
    );
  });

  it('refuses a phone that already belongs to somebody else in the event', async () => {
    const { useCase } = buildRegistrar({ phones: [{ userId: 42, telefonoDigits: '70011223' }] });

    await expect(useCase.execute(buildCommand())).rejects.toThrow(
      'El telefono del participante con correo ana@test.com ya esta asociado a otra cuenta.',
    );
  });

  it('accepts the phone of the very account being reused', async () => {
    const { useCase, repository } = buildRegistrar({
      accounts: [{ id: 42, correo: 'ana@test.com', rolEvento: 'EMPRESA', enrolledInEvent: false }],
      phones: [{ userId: 42, telefonoDigits: '70011223' }],
    });

    await useCase.execute(buildCommand());

    expect(repository.registered[0]?.participantes[0]?.existingUserId).toBe(42);
  });

  it('mints a password only for a brand new account', async () => {
    const { useCase, repository, hasher } = buildRegistrar({
      accounts: [{ id: 42, correo: 'ana@test.com', rolEvento: 'EMPRESA', enrolledInEvent: false }],
    });

    await useCase.execute(
      buildCommand({
        participantes: [
          buildParticipantBody(),
          buildParticipantBody({ correo: 'luis@test.com', telefono: '70099887', esResponsable: false }),
        ],
      }),
    );

    const [reused, created] = repository.registered[0]?.participantes ?? [];
    expect(reused?.hashedPassword).toBeNull();
    expect(created?.hashedPassword).not.toBeNull();
    // The legacy registration hashed one well-known password into every new
    // account, which anyone could then use to log in as a pending participant.
    expect(hasher.hashed).toEqual(['Temp123456']);
  });

  it('emails the person in charge once the enrollment is stored', async () => {
    const { useCase, notifier } = buildRegistrar();

    await useCase.execute(buildCommand());

    expect(notifier.sent).toHaveLength(1);
    expect(notifier.sent[0]?.correo).toBe('ana@test.com');
    expect(notifier.sent[0]?.companyEventId).toBe(COMPANY_EVENT_ID);
    expect(notifier.sent[0]?.montoPagado).toBe(1500);
  });
});

describe('CheckAvailabilityUseCase', () => {
  function build(options: FakeRegistrationOptions = {}) {
    const repository = new FakeRegistrationRepository(options);
    return { useCase: new CheckAvailabilityUseCase(repository), repository };
  }

  it('answers nothing is taken while no event is open', async () => {
    const { useCase } = build({ event: null });

    expect(await useCase.execute({ correo: 'contacto@agrobeni.com' })).toEqual({ existe: false });
  });

  it('names the company already enrolled under that corporate email', async () => {
    const { useCase } = build({
      company: { id: 5, nombre: 'Agro Beni SRL', enrolledInEvent: true },
    });

    expect(await useCase.execute({ correo: 'contacto@agrobeni.com' })).toEqual({
      existe: true,
      nombreEmpresa: 'Agro Beni SRL',
    });
  });

  it('keeps the name of a company that exists but is not in this event', async () => {
    const { useCase } = build({ company: { id: 5, nombre: 'Agro Beni', enrolledInEvent: false } });

    expect(await useCase.execute({ correo: 'contacto@agrobeni.com' })).toEqual({ existe: false });
  });

  it('names the company reachable at that WhatsApp number', async () => {
    const { useCase } = build({ companyByPhone: { id: 9, nombre: 'Ganadera Beni' } });

    expect(await useCase.execute({ telefono: '+591 70011223', tipo: 'empresa' })).toEqual({
      existe: true,
      nombreEmpresa: 'Ganadera Beni',
    });
  });

  it('reports a participant phone already in use', async () => {
    const { useCase } = build({ participantPhoneTaken: true });

    expect(await useCase.execute({ telefono: '70011223', correo: 'ana@test.com' })).toEqual({
      existe: true,
    });
  });

  it('ignores a number too short to be one', async () => {
    const { useCase } = build({ participantPhoneTaken: true });

    expect(await useCase.execute({ telefono: '700' })).toEqual({ existe: false });
  });

  it('answers nothing is taken when asked about nothing', async () => {
    const { useCase } = build();

    expect(await useCase.execute({})).toEqual({ existe: false });
  });
});

describe('ListRegistrationCitiesUseCase', () => {
  it('hands back the cities a company may pick from', async () => {
    const cities = [{ id: 1, nombre: 'Trinidad', pais: { id: 1, nombre: 'Bolivia' } }];
    const useCase = new ListRegistrationCitiesUseCase(new FakeRegistrationRepository({ cities }));

    expect(await useCase.execute()).toEqual(cities);
  });
});

describe('GetEnrollmentTrackingUseCase', () => {
  function build(options: FakeRegistrationOptions = {}) {
    return new GetEnrollmentTrackingUseCase(new FakeRegistrationRepository(options), ENV);
  }

  it('refuses a tampered link', async () => {
    await expect(build().execute(COMPANY_EVENT_ID, 'not-the-token')).rejects.toThrow(
      UnauthorizedError,
    );
  });

  it('refuses a token minted for another enrollment', async () => {
    await expect(build().execute(COMPANY_EVENT_ID, trackingTokenFor(101, SECRET))).rejects.toThrow(
      'Enlace de seguimiento inválido.',
    );
  });

  it('refuses an enrollment that is not there', async () => {
    await expect(build({ tracked: null }).execute(COMPANY_EVENT_ID, TOKEN)).rejects.toThrow(
      NotFoundError,
    );
  });

  it('shows the enrollment behind a valid link', async () => {
    const tracked = await build().execute(COMPANY_EVENT_ID, TOKEN);

    expect(tracked.id).toBe(COMPANY_EVENT_ID);
    expect(tracked.estadoVerificacionPago).toBe('PENDIENTE');
  });
});

describe('ResubmitReceiptUseCase', () => {
  function build(options: FakeRegistrationOptions = {}) {
    const repository = new FakeRegistrationRepository(options);
    return { useCase: new ResubmitReceiptUseCase(repository, ENV), repository };
  }

  it('refuses a tampered link', async () => {
    const { useCase } = build();

    await expect(
      useCase.execute(COMPANY_EVENT_ID, 'not-the-token', '/uploads/nuevo.pdf'),
    ).rejects.toThrow(UnauthorizedError);
  });

  it('refuses an enrollment that is not there', async () => {
    const { useCase } = build({ receiptTarget: null });

    await expect(useCase.execute(COMPANY_EVENT_ID, TOKEN, '/uploads/nuevo.pdf')).rejects.toThrow(
      NotFoundError,
    );
  });

  it.each(['COMPLETADO', 'RECHAZADO'])('refuses to touch a %s payment', async (estado) => {
    const { useCase } = build({
      receiptTarget: { id: COMPANY_EVENT_ID, estadoVerificacionPago: estado },
    });

    await expect(useCase.execute(COMPANY_EVENT_ID, TOKEN, '/uploads/nuevo.pdf')).rejects.toThrow(
      ConflictError,
    );
  });

  it('replaces the receipt of a payment still under review', async () => {
    const { useCase, repository } = build();

    await useCase.execute(COMPANY_EVENT_ID, TOKEN, '  /uploads/nuevo.pdf  ');

    expect(repository.replacedReceipts).toEqual([
      { companyEventId: COMPANY_EVENT_ID, urlComprobante: '/uploads/nuevo.pdf' },
    ]);
  });

  it('refuses an empty receipt', async () => {
    const { useCase } = build();

    await expect(useCase.execute(COMPANY_EVENT_ID, TOKEN, '   ')).rejects.toThrow(ValidationError);
  });
});
