import { describe, expect, it } from 'vitest';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../../../shared/domain/errors/domain.error.js';
import { FakePasswordHasher } from '../../../auth/test-doubles.js';
import {
  FakeCredentialIssuer,
  FakeParticipantNotifier,
  FakeParticipantsRepository,
  buildCapacity,
  buildEnrollment,
} from '../../test-doubles.js';
import { AddParticipantUseCase } from './add-participant.use-case.js';

const COMMAND = {
  nombres: '  Luis  ',
  apellidoPaterno: '  Rojas ',
  email: '  Luis@Test.COM ',
  telefono: '+591 700-11111',
  cargo: '  Analista ',
};

class FixedTemporaryPassword {
  generate() {
    return 'Temp123456';
  }
  generatePolicyCompliant() {
    return 'Rn!abcdefghi9aA';
  }
}

function buildUseCase(options: Parameters<typeof FakeParticipantsRepository>[0] = {}) {
  const repository = new FakeParticipantsRepository({
    responsible: { id: 10 },
    enrollment: buildEnrollment(),
    ...options,
  });
  const issuer = new FakeCredentialIssuer();
  const notifier = new FakeParticipantNotifier();
  const useCase = new AddParticipantUseCase(
    repository,
    new FakePasswordHasher(),
    new FixedTemporaryPassword(),
    issuer,
    notifier,
  );
  return { useCase, repository, issuer, notifier };
}

describe('AddParticipantUseCase', () => {
  describe('authorisation', () => {
    it('refuses a member who is not in charge', async () => {
      const { useCase } = buildUseCase({ responsible: null });

      await expect(useCase.execute({ companyEventId: 100, userId: 1, ...COMMAND })).rejects.toThrow(
        ForbiddenError,
      );
    });

    it('refuses an enrollment that is not enabled', async () => {
      const { useCase } = buildUseCase({ enrollment: null });

      await expect(useCase.execute({ companyEventId: 100, userId: 1, ...COMMAND })).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('capacity', () => {
    it('refuses when the paid slots are spent', async () => {
      const { useCase } = buildUseCase({
        enrollment: buildEnrollment({ capacity: buildCapacity({ paidSlots: 2, usedSlots: 2 }) }),
      });

      await expect(useCase.execute({ companyEventId: 100, userId: 1, ...COMMAND })).rejects.toThrow(
        /No hay cupos pagados disponibles/,
      );
    });
  });

  describe('duplicates', () => {
    it('refuses an email belonging to an internal account', async () => {
      const { useCase } = buildUseCase({
        account: { id: 9, rolEvento: 'ADMINISTRADOR', enrolledInEvent: false },
      });

      await expect(useCase.execute({ companyEventId: 100, userId: 1, ...COMMAND })).rejects.toThrow(
        /cuenta interna/,
      );
    });

    it('refuses an email already enrolled in this event', async () => {
      const { useCase } = buildUseCase({
        account: { id: 9, rolEvento: 'EMPRESA', enrolledInEvent: true },
      });

      await expect(useCase.execute({ companyEventId: 100, userId: 1, ...COMMAND })).rejects.toThrow(
        ConflictError,
      );
    });

    it('refuses a phone already used by someone else in the event', async () => {
      const { useCase } = buildUseCase({ phoneTaken: true });

      await expect(useCase.execute({ companyEventId: 100, userId: 1, ...COMMAND })).rejects.toThrow(
        /teléfono ya pertenece a otra cuenta/,
      );
    });

    it('compares phones by their digits only', async () => {
      const { useCase, repository } = buildUseCase();

      await useCase.execute({ companyEventId: 100, userId: 1, ...COMMAND });

      expect(repository.phoneChecks[0]?.phone).toBe('59170011111');
    });

    it('skips the phone check when no phone is supplied', async () => {
      const { useCase, repository } = buildUseCase();

      await useCase.execute({ companyEventId: 100, userId: 1, ...COMMAND, telefono: '' });

      expect(repository.phoneChecks).toEqual([]);
    });
  });

  describe('creating the participant', () => {
    it('trims the submitted fields and normalises the email', async () => {
      const { useCase, repository } = buildUseCase();

      await useCase.execute({ companyEventId: 100, userId: 1, ...COMMAND });

      expect(repository.added[0]).toMatchObject({
        nombres: 'Luis',
        apellidoPaterno: 'Rojas',
        email: 'luis@test.com',
        cargo: 'Analista',
      });
    });

    it('defaults the role to participante when no position is given', async () => {
      const { useCase, repository } = buildUseCase();

      await useCase.execute({ companyEventId: 100, userId: 1, ...COMMAND, cargo: undefined });

      expect(repository.added[0]?.cargo).toBe('Participante');
    });

    it('issues a temporary password for a brand new account', async () => {
      const { useCase, repository, notifier } = buildUseCase();

      await useCase.execute({ companyEventId: 100, userId: 1, ...COMMAND });

      expect(repository.added[0]?.hashedPassword).toBe('$2b$10$Temp123456');
      expect(notifier.sent[0]?.temporaryPassword).toBe('Temp123456');
    });

    it('reuses an existing account without touching its password', async () => {
      const { useCase, repository, notifier } = buildUseCase({
        account: { id: 9, rolEvento: 'EMPRESA', enrolledInEvent: false },
      });

      const result = await useCase.execute({ companyEventId: 100, userId: 1, ...COMMAND });

      expect(repository.added[0]?.existingUserId).toBe(9);
      expect(repository.added[0]?.hashedPassword).toBeNull();
      expect(notifier.sent[0]?.temporaryPassword).toBeNull();
      expect(result.reutilizado).toBe(true);
    });

    it('issues the QR badge, because the company is already enabled', async () => {
      const { useCase, issuer } = buildUseCase();

      await useCase.execute({ companyEventId: 100, userId: 1, ...COMMAND });

      expect(issuer.issued).toEqual([{ companyUserId: 55, fullName: 'Luis Rojas' }]);
    });

    it('still registers the participant when the badge cannot be issued', async () => {
      const { useCase, issuer } = buildUseCase();
      issuer.shouldFail = true;

      const result = await useCase.execute({ companyEventId: 100, userId: 1, ...COMMAND });

      expect(result.participanteId).toBe(55);
    });

    it('reports whether the credentials email went out', async () => {
      const { useCase, notifier } = buildUseCase();
      notifier.delivers = false;

      const result = await useCase.execute({ companyEventId: 100, userId: 1, ...COMMAND });

      expect(result.credencialesEnviadas).toBe(false);
    });
  });
});
