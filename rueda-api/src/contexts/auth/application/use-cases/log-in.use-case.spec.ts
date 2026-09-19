import { describe, expect, it } from 'vitest';
import { UnauthorizedError } from '../../../../shared/domain/errors/domain.error.js';
import { ROLES } from '../../../../shared/domain/role.js';
import {
  FakeCompanyMembershipRepository,
  FakePasswordHasher,
  FakeTokenSigner,
  FakeUserAccountRepository,
  buildMembership,
  buildUserAccount,
  fakeHash,
} from '../../test-doubles.js';
import { LogInUseCase } from './log-in.use-case.js';

const PASSWORD = 'Rueda2026!segura';
const GRANTED = [{ id: 10, companyEventId: 100 }];
const APPROVED = { accessStatus: 'HABILITADO', paymentStatus: 'COMPLETADO' };

function buildUseCase(options: {
  accounts?: ReturnType<typeof buildUserAccount>[];
  membership?: ReturnType<typeof buildMembership> | null;
  enrollment?: { accessStatus: string; paymentStatus: string } | null;
  granted?: { id: number; companyEventId: number }[];
  principalEventId?: number | null;
}) {
  const users = new FakeUserAccountRepository(options.accounts ?? []);
  const memberships = new FakeCompanyMembershipRepository(
    options.principalEventId ?? 100,
    options.membership ?? null,
    options.enrollment ?? null,
    options.granted ?? [],
  );
  const hasher = new FakePasswordHasher();
  const signer = new FakeTokenSigner();

  return { useCase: new LogInUseCase(users, memberships, hasher, signer), users, hasher, signer };
}

describe('LogInUseCase', () => {
  describe('credentials', () => {
    it('rejects an unknown email without revealing that it is unknown', async () => {
      const { useCase } = buildUseCase({});

      await expect(useCase.execute({ email: 'ghost@test.com', password: PASSWORD })).rejects.toThrow(
        new UnauthorizedError('Credenciales inválidas'),
      );
    });

    it('rejects a wrong password with the same message as an unknown email', async () => {
      const { useCase } = buildUseCase({ accounts: [buildUserAccount()] });

      await expect(
        useCase.execute({ email: 'empresa@test.com', password: 'Otra2026!clave' }),
      ).rejects.toThrow(new UnauthorizedError('Credenciales inválidas'));
    });

    it('normalises the email before looking the account up', async () => {
      const { useCase } = buildUseCase({
        accounts: [buildUserAccount({ role: ROLES.ADMIN })],
      });

      const result = await useCase.execute({ email: '  EMPRESA@Test.com ', password: PASSWORD });

      expect(result.id).toBe(1);
    });
  });

  describe('legacy plaintext accounts', () => {
    it('accepts a literal match and re-hashes the password in place', async () => {
      const { useCase, users, hasher } = buildUseCase({
        accounts: [buildUserAccount({ role: ROLES.ADMIN, storedPassword: PASSWORD })],
      });

      await useCase.execute({ email: 'empresa@test.com', password: PASSWORD });

      expect(hasher.hashed).toEqual([PASSWORD]);
      expect(users.passwordUpdates).toEqual([{ userId: 1, hashedPassword: fakeHash(PASSWORD) }]);
    });

    it('does not re-hash an account already stored as bcrypt', async () => {
      const { useCase, users } = buildUseCase({
        accounts: [buildUserAccount({ role: ROLES.ADMIN })],
      });

      await useCase.execute({ email: 'empresa@test.com', password: PASSWORD });

      expect(users.passwordUpdates).toEqual([]);
    });
  });

  describe('event team accounts', () => {
    it('detaches a technician from any persisted event, because staff is global', async () => {
      const { useCase, users, signer } = buildUseCase({
        accounts: [buildUserAccount({ role: ROLES.TECNICO, assignedEventId: 7 })],
      });

      const result = await useCase.execute({ email: 'empresa@test.com', password: PASSWORD });

      expect(users.clearedEvents).toEqual([1]);
      expect(result.assignedEventId).toBeNull();
      expect(signer.signed[0]?.eventoId).toBeNull();
    });

    it('leaves a technician without a persisted event untouched', async () => {
      const { useCase, users } = buildUseCase({
        accounts: [buildUserAccount({ role: ROLES.TECNICO_EVENTOS, assignedEventId: null })],
      });

      await useCase.execute({ email: 'empresa@test.com', password: PASSWORD });

      expect(users.clearedEvents).toEqual([]);
    });

    it('keeps the persisted event of an administrator', async () => {
      const { useCase, users } = buildUseCase({
        accounts: [buildUserAccount({ role: ROLES.ADMIN, assignedEventId: 7 })],
      });

      const result = await useCase.execute({ email: 'empresa@test.com', password: PASSWORD });

      expect(users.clearedEvents).toEqual([]);
      expect(result.assignedEventId).toBe(7);
    });
  });

  describe('company accounts', () => {
    it('refuses a company with no membership in the principal event', async () => {
      const { useCase } = buildUseCase({ accounts: [buildUserAccount()], membership: null });

      await expect(useCase.execute({ email: 'empresa@test.com', password: PASSWORD })).rejects.toThrow(
        /no está habilitada para el evento actual/,
      );
    });

    it('refuses an enrollment with observations', async () => {
      const { useCase } = buildUseCase({
        accounts: [buildUserAccount()],
        membership: buildMembership(),
        enrollment: { accessStatus: 'HABILITADO', paymentStatus: 'OBSERVADO' },
      });

      await expect(useCase.execute({ email: 'empresa@test.com', password: PASSWORD })).rejects.toThrow(
        /observaciones pendientes/,
      );
    });

    it('refuses a rejected enrollment', async () => {
      const { useCase } = buildUseCase({
        accounts: [buildUserAccount()],
        membership: buildMembership(),
        enrollment: { accessStatus: 'HABILITADO', paymentStatus: 'RECHAZADO' },
      });

      await expect(useCase.execute({ email: 'empresa@test.com', password: PASSWORD })).rejects.toThrow(
        /fue rechazada/,
      );
    });

    it('refuses an enrollment still pending approval', async () => {
      const { useCase } = buildUseCase({
        accounts: [buildUserAccount()],
        membership: buildMembership(),
        enrollment: { accessStatus: 'PENDIENTE', paymentStatus: 'PENDIENTE' },
      });

      await expect(useCase.execute({ email: 'empresa@test.com', password: PASSWORD })).rejects.toThrow(
        /pendiente de aprobación/,
      );
    });

    it('returns the membership ids of an approved company', async () => {
      const { useCase } = buildUseCase({
        accounts: [buildUserAccount()],
        membership: buildMembership(),
        enrollment: APPROVED,
        granted: GRANTED,
      });

      const result = await useCase.execute({ email: 'empresa@test.com', password: PASSWORD });

      expect(result.isResponsible).toBe(true);
      expect(result.companyEventId).toBe(100);
      expect(result.companyUserId).toBe(10);
    });

    it('prefers the per-event identity over the account identity', async () => {
      const { useCase } = buildUseCase({
        accounts: [buildUserAccount()],
        membership: buildMembership({
          nombresEvento: 'Anita',
          apellidoPaternoEvento: 'Gomez',
          apellidoMaternoEvento: null,
          telefonoEvento: '71111111',
        }),
        enrollment: APPROVED,
        granted: GRANTED,
      });

      const result = await useCase.execute({ email: 'empresa@test.com', password: PASSWORD });

      expect(result.nombres).toBe('Anita');
      expect(result.apellidoPaterno).toBe('Gomez');
      expect(result.telefono).toBe('71111111');
      // A null override keeps the account value instead of blanking it.
      expect(result.apellidoMaterno).toBe('Lopez');
    });
  });

  describe('issued token', () => {
    it('scopes the claims to every granted membership', async () => {
      const { useCase, signer } = buildUseCase({
        accounts: [buildUserAccount()],
        membership: buildMembership(),
        enrollment: APPROVED,
        granted: [
          { id: 10, companyEventId: 100 },
          { id: 11, companyEventId: 101 },
        ],
      });

      const result = await useCase.execute({ email: 'empresa@test.com', password: PASSWORD });

      expect(signer.signed).toEqual([
        { sub: 1, role: ROLES.EMPRESA, eventoId: null, eeIds: [100, 101], euIds: [10, 11] },
      ]);
      expect(result.token).toBe('token-for-1');
    });

    it('never leaks the stored password in the result', async () => {
      const { useCase } = buildUseCase({ accounts: [buildUserAccount({ role: ROLES.ADMIN })] });

      const result = await useCase.execute({ email: 'empresa@test.com', password: PASSWORD });

      expect(JSON.stringify(result)).not.toContain(fakeHash(PASSWORD));
      expect(JSON.stringify(result)).not.toContain(PASSWORD);
    });
  });
});
