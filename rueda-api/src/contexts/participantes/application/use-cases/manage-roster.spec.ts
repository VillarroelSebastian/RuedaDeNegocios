import { describe, expect, it } from 'vitest';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../../shared/domain/errors/domain.error.js';
import { FakePasswordHasher, fakeHash } from '../../../auth/test-doubles.js';
import type { ParticipantRoster } from '../../domain/ports/participants.repository.port.js';
import { FakeParticipantsRepository, buildCapacity } from '../../test-doubles.js';
import { GetRosterUseCase } from './get-roster.use-case.js';
import { IssueTemporaryPasswordUseCase } from './issue-temporary-password.use-case.js';
import { RemoveParticipantUseCase } from './remove-participant.use-case.js';

const payment = (overrides: Partial<ParticipantRoster['pagos'][number]> = {}) => ({
  id: 1,
  tipoPago: 'INSCRIPCION',
  cantidadParticipantes: 2,
  montoPago: 500,
  estadoPago: 'APROBADO',
  observacion: null,
  urlComprobante: null,
  fechaCreacion: new Date('2026-09-01T00:00:00.000Z'),
  ...overrides,
});

function buildRoster(overrides: Partial<ParticipantRoster> = {}): ParticipantRoster {
  return {
    capacity: buildCapacity({ paidSlots: 4, usedSlots: 2 }),
    participantes: [],
    pagos: [payment()],
    ...overrides,
  };
}

class FixedTemporaryPassword {
  generate() {
    return 'Temp123456';
  }
  generatePolicyCompliant() {
    return 'Rn!abcdefghi9aA';
  }
}

describe('GetRosterUseCase', () => {
  it('derives the slot counters from the capacity', async () => {
    const repository = new FakeParticipantsRepository({ roster: buildRoster() });

    const view = await new GetRosterUseCase(repository).execute(100);

    expect(view).toMatchObject({
      slotsUsados: 2,
      slotsPagados: 4,
      slotsDisponibles: 2,
      maxPermitidos: 6,
    });
  });

  it('flags a top-up payment still under review', async () => {
    const repository = new FakeParticipantsRepository({
      roster: buildRoster({
        pagos: [payment({ tipoPago: 'ADICIONAL', estadoPago: 'PENDIENTE' })],
      }),
    });

    expect((await new GetRosterUseCase(repository).execute(100)).pagoAdicionalPendiente).toBe(true);
  });

  it('does not flag an approved top-up', async () => {
    const repository = new FakeParticipantsRepository({
      roster: buildRoster({ pagos: [payment({ tipoPago: 'ADICIONAL', estadoPago: 'APROBADO' })] }),
    });

    expect((await new GetRosterUseCase(repository).execute(100)).pagoAdicionalPendiente).toBe(false);
  });

  it('fails for an unknown enrollment', async () => {
    await expect(new GetRosterUseCase(new FakeParticipantsRepository()).execute(100)).rejects.toThrow(
      NotFoundError,
    );
  });
});

describe('RemoveParticipantUseCase', () => {
  const command = { companyEventId: 100, userId: 1, companyUserId: 55 };

  it('deactivates a participant of the caller own enrollment', async () => {
    const repository = new FakeParticipantsRepository({
      responsible: { id: 10 },
      removable: { id: 55, userId: 77 },
    });

    await new RemoveParticipantUseCase(repository).execute(command);

    expect(repository.deactivated).toEqual([{ companyUserId: 55, userId: 77 }]);
  });

  it('refuses a member who is not in charge', async () => {
    const repository = new FakeParticipantsRepository({ responsible: null });

    await expect(new RemoveParticipantUseCase(repository).execute(command)).rejects.toThrow(
      ForbiddenError,
    );
  });

  it('refuses to let the person in charge remove themselves', async () => {
    const repository = new FakeParticipantsRepository({ responsible: { id: 55 } });

    await expect(new RemoveParticipantUseCase(repository).execute(command)).rejects.toThrow(
      ConflictError,
    );
    expect(repository.deactivated).toEqual([]);
  });

  it('refuses a participant outside the caller enrollment', async () => {
    const repository = new FakeParticipantsRepository({
      responsible: { id: 10 },
      removable: null,
    });

    await expect(new RemoveParticipantUseCase(repository).execute(command)).rejects.toThrow(
      NotFoundError,
    );
  });
});

describe('IssueTemporaryPasswordUseCase', () => {
  function buildUseCase(activeAccount: { id: number; correo: string } | null) {
    const repository = new FakeParticipantsRepository({ activeAccount });
    const useCase = new IssueTemporaryPasswordUseCase(
      repository,
      new FakePasswordHasher(),
      new FixedTemporaryPassword(),
    );
    return { useCase, repository };
  }

  it('mints a policy compliant password and returns it once', async () => {
    const { useCase, repository } = buildUseCase({ id: 7, correo: 'luis@test.com' });

    const result = await useCase.execute({ userId: 7 });

    expect(result).toEqual({ correo: 'luis@test.com', nuevaContrasenia: 'Rn!abcdefghi9aA' });
    expect(repository.passwords).toEqual([
      { userId: 7, hashedPassword: fakeHash('Rn!abcdefghi9aA') },
    ]);
  });

  it('accepts a password dictated by the administrator', async () => {
    const { useCase, repository } = buildUseCase({ id: 7, correo: 'luis@test.com' });

    await useCase.execute({ userId: 7, nuevaContrasenia: 'Rueda2026!segura' });

    expect(repository.passwords[0]?.hashedPassword).toBe(fakeHash('Rueda2026!segura'));
  });

  it('holds a dictated password to the same policy', async () => {
    const { useCase } = buildUseCase({ id: 7, correo: 'luis@test.com' });

    await expect(useCase.execute({ userId: 7, nuevaContrasenia: 'corta' })).rejects.toThrow(
      ValidationError,
    );
  });

  it('ignores a blank dictated password and mints one instead', async () => {
    const { useCase, repository } = buildUseCase({ id: 7, correo: 'luis@test.com' });

    await useCase.execute({ userId: 7, nuevaContrasenia: '   ' });

    expect(repository.passwords[0]?.hashedPassword).toBe(fakeHash('Rn!abcdefghi9aA'));
  });

  it('fails for an account that is not an active participant', async () => {
    const { useCase } = buildUseCase(null);

    await expect(useCase.execute({ userId: 7 })).rejects.toThrow(NotFoundError);
  });
});
