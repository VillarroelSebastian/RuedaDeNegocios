import { describe, expect, it } from 'vitest';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/domain.error.js';
import {
  FakePasswordHasher,
  FakeUserAccountRepository,
  buildUserAccount,
  fakeHash,
} from '../../test-doubles.js';
import { ChangePasswordUseCase } from './change-password.use-case.js';

const CURRENT = 'Rueda2026!segura';
const NEXT = 'Rueda2027#nueva';

function buildUseCase(accounts = [buildUserAccount()]) {
  const users = new FakeUserAccountRepository(accounts);
  return { useCase: new ChangePasswordUseCase(users, new FakePasswordHasher()), users };
}

describe('ChangePasswordUseCase', () => {
  it('replaces the password when the current one matches', async () => {
    const { useCase, users } = buildUseCase();

    await useCase.execute({ userId: 1, currentPassword: CURRENT, newPassword: NEXT });

    expect(users.passwordUpdates).toEqual([{ userId: 1, hashedPassword: fakeHash(NEXT) }]);
  });

  it('rejects a wrong current password', async () => {
    const { useCase, users } = buildUseCase();

    await expect(
      useCase.execute({ userId: 1, currentPassword: 'Otra2026!clave', newPassword: NEXT }),
    ).rejects.toThrow(new ValidationError('La contraseña actual es incorrecta.'));
    expect(users.passwordUpdates).toEqual([]);
  });

  it('rejects a new password that breaks the policy before touching the account', async () => {
    const { useCase, users } = buildUseCase();

    await expect(
      useCase.execute({ userId: 1, currentPassword: CURRENT, newPassword: 'corta' }),
    ).rejects.toThrow(ValidationError);
    expect(users.passwordUpdates).toEqual([]);
  });

  it('rejects an unknown account', async () => {
    const { useCase } = buildUseCase([]);

    await expect(
      useCase.execute({ userId: 99, currentPassword: CURRENT, newPassword: NEXT }),
    ).rejects.toThrow(NotFoundError);
  });

  it('accepts the current password of an account still stored in plaintext', async () => {
    const { useCase, users } = buildUseCase([buildUserAccount({ storedPassword: CURRENT })]);

    await useCase.execute({ userId: 1, currentPassword: CURRENT, newPassword: NEXT });

    expect(users.passwordUpdates).toEqual([{ userId: 1, hashedPassword: fakeHash(NEXT) }]);
  });
});
