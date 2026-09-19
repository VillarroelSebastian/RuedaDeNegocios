import { describe, expect, it } from 'vitest';
import {
  FakePasswordHasher,
  FakePasswordResetNotifier,
  FakeUserAccountRepository,
  FixedClock,
  FixedVerificationCodeGenerator,
  fakeHash,
} from '../../test-doubles.js';
import { RequestPasswordResetUseCase } from './request-password-reset.use-case.js';

const NOW = new Date('2026-09-18T12:00:00.000Z');
const RECIPIENT = { id: 5, email: 'empresa@test.com', nombres: 'Ana' };

function buildUseCase(recipient = RECIPIENT as typeof RECIPIENT | null) {
  const users = new FakeUserAccountRepository([], recipient);
  const notifier = new FakePasswordResetNotifier();
  const useCase = new RequestPasswordResetUseCase(
    users,
    new FakePasswordHasher(),
    new FixedVerificationCodeGenerator('654321'),
    new FixedClock(NOW),
    notifier,
  );
  return { useCase, users, notifier };
}

describe('RequestPasswordResetUseCase', () => {
  it('stores the hashed code, never the code itself', async () => {
    const { useCase, users } = buildUseCase();

    await useCase.execute({ email: 'empresa@test.com' });

    expect(users.savedResetTokens).toHaveLength(1);
    expect(users.savedResetTokens[0]?.hashedCode).toBe(fakeHash('654321'));
    expect(users.savedResetTokens[0]?.userId).toBe(5);
  });

  it('expires the code 15 minutes after it is issued', async () => {
    const { useCase, users } = buildUseCase();

    await useCase.execute({ email: 'empresa@test.com' });

    expect(users.savedResetTokens[0]?.expiresAt).toEqual(new Date('2026-09-18T12:15:00.000Z'));
  });

  it('emails the plaintext code to the account holder', async () => {
    const { useCase, notifier } = buildUseCase();

    await useCase.execute({ email: 'empresa@test.com' });

    expect(notifier.notified).toEqual([
      { email: 'empresa@test.com', nombres: 'Ana', code: '654321' },
    ]);
  });

  it('stays silent about unknown accounts, so the endpoint cannot enumerate emails', async () => {
    const { useCase, users, notifier } = buildUseCase(null);

    await expect(useCase.execute({ email: 'ghost@test.com' })).resolves.toBeUndefined();

    expect(users.savedResetTokens).toEqual([]);
    expect(notifier.notified).toEqual([]);
  });

  it('normalises the email before looking the account up', async () => {
    const { useCase, notifier } = buildUseCase();

    await useCase.execute({ email: '  EMPRESA@Test.com  ' });

    expect(notifier.notified).toHaveLength(1);
  });
});
