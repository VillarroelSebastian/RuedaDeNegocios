import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../../../shared/domain/errors/domain.error.js';
import type { ResetTokenCandidate } from '../../domain/ports/user-account.repository.port.js';
import {
  FakePasswordHasher,
  FakeUserAccountRepository,
  FixedClock,
  fakeHash,
} from '../../test-doubles.js';
import { ConfirmPasswordResetUseCase } from './confirm-password-reset.use-case.js';

const NOW = new Date('2026-09-18T12:00:00.000Z');
const FUTURE = new Date('2026-09-18T12:10:00.000Z');
const PAST = new Date('2026-09-18T11:50:00.000Z');
const NEW_PASSWORD = 'Rueda2027#nueva';

function buildUseCase(candidates: ResetTokenCandidate[]) {
  const users = new FakeUserAccountRepository([], null, candidates);
  const useCase = new ConfirmPasswordResetUseCase(
    users,
    new FakePasswordHasher(),
    new FixedClock(NOW),
  );
  return { useCase, users };
}

const command = { email: 'empresa@test.com', code: '654321', newPassword: NEW_PASSWORD };

describe('ConfirmPasswordResetUseCase', () => {
  it('sets the new password and clears the token when the code is valid', async () => {
    const { useCase, users } = buildUseCase([
      { id: 5, hashedCode: fakeHash('654321'), expiresAt: FUTURE },
    ]);

    await useCase.execute(command);

    expect(users.completedResets).toEqual([{ userId: 5, hashedPassword: fakeHash(NEW_PASSWORD) }]);
  });

  it('reports an expired code distinctly from a wrong one', async () => {
    const { useCase, users } = buildUseCase([
      { id: 5, hashedCode: fakeHash('654321'), expiresAt: PAST },
    ]);

    await expect(useCase.execute(command)).rejects.toThrow(
      new ValidationError('El código ha expirado. Solicita uno nuevo.'),
    );
    expect(users.completedResets).toEqual([]);
  });

  it('treats a missing expiry as expired', async () => {
    const { useCase } = buildUseCase([{ id: 5, hashedCode: fakeHash('654321'), expiresAt: null }]);

    await expect(useCase.execute(command)).rejects.toThrow(/expirado/);
  });

  it('reports a wrong code', async () => {
    const { useCase } = buildUseCase([
      { id: 5, hashedCode: fakeHash('999999'), expiresAt: FUTURE },
    ]);

    await expect(useCase.execute(command)).rejects.toThrow(
      new ValidationError('El código es incorrecto.'),
    );
  });

  it('reports a wrong code when no candidate holds a token at all', async () => {
    const { useCase } = buildUseCase([]);

    await expect(useCase.execute(command)).rejects.toThrow(/incorrecto/);
  });

  it('picks the valid candidate when historical duplicates share the email', async () => {
    const { useCase, users } = buildUseCase([
      { id: 9, hashedCode: fakeHash('111111'), expiresAt: FUTURE },
      { id: 5, hashedCode: fakeHash('654321'), expiresAt: FUTURE },
    ]);

    await useCase.execute(command);

    expect(users.completedResets).toEqual([{ userId: 5, hashedPassword: fakeHash(NEW_PASSWORD) }]);
  });

  it('prefers a live token over an expired one carrying the same code', async () => {
    const { useCase, users } = buildUseCase([
      { id: 9, hashedCode: fakeHash('654321'), expiresAt: PAST },
      { id: 5, hashedCode: fakeHash('654321'), expiresAt: FUTURE },
    ]);

    await useCase.execute(command);

    expect(users.completedResets).toEqual([{ userId: 5, hashedPassword: fakeHash(NEW_PASSWORD) }]);
  });

  it('enforces the password policy before checking the code', async () => {
    const { useCase, users } = buildUseCase([
      { id: 5, hashedCode: fakeHash('654321'), expiresAt: FUTURE },
    ]);

    await expect(useCase.execute({ ...command, newPassword: 'corta' })).rejects.toThrow(
      ValidationError,
    );
    expect(users.completedResets).toEqual([]);
  });
});
