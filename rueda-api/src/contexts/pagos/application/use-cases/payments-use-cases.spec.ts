import { describe, expect, it } from 'vitest';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../../shared/domain/errors/domain.error.js';
import { FakePasswordHasher, fakeHash } from '../../../auth/test-doubles.js';
import { FakeCredentialIssuer } from '../../../participantes/test-doubles.js';
import {
  FakeCompanyNotifier,
  FakePaymentNotifier,
  FakePaymentsRepository,
  buildApproved,
  buildCapacity,
  buildMember,
} from '../../test-doubles.js';
import { ApproveEnrollmentPaymentUseCase } from './approve-enrollment-payment.use-case.js';
import {
  ListPaymentsUseCase,
  ObserveEnrollmentPaymentUseCase,
  RejectEnrollmentPaymentUseCase,
} from './review-enrollment-payment.use-cases.js';
import {
  ApproveTopUpUseCase,
  ObserveTopUpUseCase,
  RejectTopUpUseCase,
  RequestTopUpUseCase,
} from './top-up.use-cases.js';

class FixedTemporaryPassword {
  generate() {
    return 'Temp123456';
  }
  generatePolicyCompliant() {
    return 'Rn!abcdefghi9aA';
  }
}

function buildApprover(options: ConstructorParameters<typeof FakePaymentsRepository>[0] = {}) {
  const repository = new FakePaymentsRepository(options);
  const notifier = new FakePaymentNotifier();
  const companies = new FakeCompanyNotifier();
  const issuer = new FakeCredentialIssuer();
  const useCase = new ApproveEnrollmentPaymentUseCase(
    repository,
    new FakePasswordHasher(),
    new FixedTemporaryPassword(),
    issuer,
    notifier,
    companies,
  );
  return { useCase, repository, notifier, companies, issuer };
}

describe('ApproveEnrollmentPaymentUseCase', () => {
  it('issues a badge and emails credentials to every member', async () => {
    const { useCase, notifier, issuer } = buildApprover({
      approved: buildApproved({
        members: [buildMember(), buildMember({ companyUserId: 11, userId: 2, correo: 'luis@test.com' })],
      }),
    });

    const result = await useCase.execute(100);

    expect(issuer.issued).toHaveLength(2);
    expect(notifier.approvals).toHaveLength(2);
    expect(result.credencialesEnviadas).toBe(true);
  });

  it('mints a password only for an account that is not reused', async () => {
    const { useCase, notifier } = buildApprover({
      approved: buildApproved({
        members: [buildMember(), buildMember({ companyUserId: 11, userId: 2, reusedAccount: true })],
      }),
    });

    await useCase.execute(100);

    expect(notifier.approvals[0]?.temporaryPassword).toBe('Temp123456');
    expect(notifier.approvals[1]?.temporaryPassword).toBeNull();
  });

  it('writes the new password only after the email carrying it went out', async () => {
    const { useCase, repository } = buildApprover();

    await useCase.execute(100);

    expect(repository.passwords).toEqual([{ userId: 1, hashedPassword: fakeHash('Temp123456') }]);
  });

  it('leaves the password untouched when the email fails, so nobody is locked out', async () => {
    const { useCase, repository, notifier } = buildApprover();
    notifier.delivers = false;

    const result = await useCase.execute(100);

    expect(repository.passwords).toEqual([]);
    expect(result.correosFallidos).toEqual(['ana@test.com']);
    expect(result.credencialesEnviadas).toBe(false);
  });

  it('still emails the credentials when the badge cannot be rendered', async () => {
    const { useCase, notifier, issuer } = buildApprover();
    issuer.shouldFail = true;

    await useCase.execute(100);

    expect(notifier.approvals[0]?.qrUrl).toBeNull();
    expect(notifier.approvals).toHaveLength(1);
  });

  it('notifies the company that it is in', async () => {
    const { useCase, companies } = buildApprover();

    await useCase.execute(100);

    expect(companies.sent[0]).toMatchObject({ companyEventId: 100, tipo: 'pago:aprobado' });
  });
});

describe('ListPaymentsUseCase', () => {
  it('applies the default page size of the review screen', async () => {
    const repository = new FakePaymentsRepository();

    await new ListPaymentsUseCase(repository).execute({});

    expect(repository.listCalls[0]).toMatchObject({ page: 1, limit: 15 });
  });

  it('caps the page size', async () => {
    const repository = new FakePaymentsRepository();

    await new ListPaymentsUseCase(repository).execute({ limit: 5000 });

    expect(repository.listCalls[0]?.limit).toBe(100);
  });

  it('forwards the status filter', async () => {
    const repository = new FakePaymentsRepository();

    await new ListPaymentsUseCase(repository).execute({ estado: 'PENDIENTE' });

    expect(repository.listCalls[0]?.estado).toBe('PENDIENTE');
  });
});

describe('ObserveEnrollmentPaymentUseCase', () => {
  it('records the observation and writes to the person in charge', async () => {
    const repository = new FakePaymentsRepository();
    const notifier = new FakePaymentNotifier();

    await new ObserveEnrollmentPaymentUseCase(repository, notifier).execute(100, '  Falta sello ');

    expect(repository.observed).toEqual([{ companyEventId: 100, observacion: 'Falta sello' }]);
    expect(notifier.observations).toEqual([
      { correo: 'ana@test.com', observacion: 'Falta sello' },
    ]);
  });

  it('refuses an empty observation', async () => {
    const repository = new FakePaymentsRepository();

    await expect(
      new ObserveEnrollmentPaymentUseCase(repository, new FakePaymentNotifier()).execute(100, '   '),
    ).rejects.toThrow(ValidationError);
    expect(repository.observed).toEqual([]);
  });

  it('fails for an unknown payment', async () => {
    const repository = new FakePaymentsRepository({ contact: null });

    await expect(
      new ObserveEnrollmentPaymentUseCase(repository, new FakePaymentNotifier()).execute(100, 'x'),
    ).rejects.toThrow(NotFoundError);
  });
});

describe('RejectEnrollmentPaymentUseCase', () => {
  it('records the reason, writes and notifies', async () => {
    const repository = new FakePaymentsRepository();
    const notifier = new FakePaymentNotifier();
    const companies = new FakeCompanyNotifier();

    await new RejectEnrollmentPaymentUseCase(repository, notifier, companies).execute(100, 'Monto menor');

    expect(repository.rejected).toEqual([{ companyEventId: 100, motivo: 'Monto menor' }]);
    expect(notifier.rejections).toHaveLength(1);
    expect(companies.sent[0]?.tipo).toBe('pago:rechazado');
  });

  it('refuses an empty reason', async () => {
    await expect(
      new RejectEnrollmentPaymentUseCase(
        new FakePaymentsRepository(),
        new FakePaymentNotifier(),
        new FakeCompanyNotifier(),
      ).execute(100, ''),
    ).rejects.toThrow(ValidationError);
  });
});

describe('RequestTopUpUseCase', () => {
  const command = {
    companyEventId: 100,
    userId: 1,
    cantidadParticipantes: 2,
    urlComprobante: '/uploads/comprobante.pdf',
  };

  it('creates the request priced from the quote', async () => {
    const repository = new FakePaymentsRepository();

    const result = await new RequestTopUpUseCase(repository).execute(command);

    expect(result).toEqual({ comprobanteId: 77, montoPago: 200 });
    expect(repository.createdTopUps[0]).toMatchObject({ extraSlots: 2, amount: 200 });
  });

  it('refuses a member who is not in charge', async () => {
    const repository = new FakePaymentsRepository({ responsible: false });

    await expect(new RequestTopUpUseCase(repository).execute(command)).rejects.toThrow(
      ForbiddenError,
    );
  });

  it('refuses a request for no slots', async () => {
    await expect(
      new RequestTopUpUseCase(new FakePaymentsRepository()).execute({
        ...command,
        cantidadParticipantes: 0,
      }),
    ).rejects.toThrow(ValidationError);
  });

  it('refuses a request with no receipt', async () => {
    await expect(
      new RequestTopUpUseCase(new FakePaymentsRepository()).execute({
        ...command,
        urlComprobante: '  ',
      }),
    ).rejects.toThrow(ValidationError);
  });

  it('refuses a request that would exceed the package ceiling', async () => {
    const repository = new FakePaymentsRepository({
      capacity: buildCapacity({ paidSlots: 5, packageMaxParticipants: 6, packageIncludedCredentials: 4 }),
    });

    await expect(
      new RequestTopUpUseCase(repository).execute({ ...command, cantidadParticipantes: 3 }),
    ).rejects.toThrow(/superarías el máximo permitido de 6/);
  });

  it('measures the ceiling against the paid slots, not against the ones used', async () => {
    const repository = new FakePaymentsRepository({
      capacity: buildCapacity({ paidSlots: 4, usedSlots: 0, packageMaxParticipants: 6 }),
    });

    await expect(
      new RequestTopUpUseCase(repository).execute({ ...command, cantidadParticipantes: 2 }),
    ).resolves.toBeDefined();
  });
});

describe('ApproveTopUpUseCase', () => {
  it('raises the paid slots and notifies the company', async () => {
    const repository = new FakePaymentsRepository();
    const companies = new FakeCompanyNotifier();

    const result = await new ApproveTopUpUseCase(repository, companies).execute(77);

    expect(result).toEqual({ nuevoTotalSlots: 4 });
    expect(repository.approvedTopUps).toEqual([{ topUpId: 77, companyEventId: 100, newTotal: 4 }]);
    expect(companies.sent[0]?.tipo).toBe('pago-adicional:aprobado');
  });

  it('refuses a request that was already processed', async () => {
    const repository = new FakePaymentsRepository({ pendingTopUp: null });

    await expect(
      new ApproveTopUpUseCase(repository, new FakeCompanyNotifier()).execute(77),
    ).rejects.toThrow(NotFoundError);
  });

  it('re-checks the ceiling at approval time, since the package may have changed', async () => {
    const repository = new FakePaymentsRepository({
      capacity: buildCapacity({ paidSlots: 5, packageMaxParticipants: 6, packageIncludedCredentials: 4 }),
    });

    await expect(
      new ApproveTopUpUseCase(repository, new FakeCompanyNotifier()).execute(77),
    ).rejects.toThrow(ConflictError);
    expect(repository.approvedTopUps).toEqual([]);
  });
});

describe('RejectTopUpUseCase', () => {
  it('records the rejection with its reason', async () => {
    const repository = new FakePaymentsRepository();
    const companies = new FakeCompanyNotifier();

    await new RejectTopUpUseCase(repository, companies).execute(77, ' Comprobante ilegible ');

    expect(repository.topUpStatuses).toEqual([
      { topUpId: 77, estado: 'RECHAZADO', observacion: 'Comprobante ilegible' },
    ]);
    expect(companies.sent[0]?.mensaje).toContain('Comprobante ilegible');
  });

  it('accepts a rejection with no reason', async () => {
    const repository = new FakePaymentsRepository();

    await new RejectTopUpUseCase(repository, new FakeCompanyNotifier()).execute(77);

    expect(repository.topUpStatuses[0]?.observacion).toBeNull();
  });
});

describe('ObserveTopUpUseCase', () => {
  it('records the observation and tells the company', async () => {
    const repository = new FakePaymentsRepository();
    const companies = new FakeCompanyNotifier();

    await new ObserveTopUpUseCase(repository, companies).execute(77, 'Monto incompleto');

    expect(repository.topUpStatuses).toEqual([
      { topUpId: 77, estado: 'OBSERVADO', observacion: 'Monto incompleto' },
    ]);
    expect(companies.sent[0]?.tipo).toBe('pago-adicional:observado');
  });

  it('refuses an empty observation', async () => {
    await expect(
      new ObserveTopUpUseCase(new FakePaymentsRepository(), new FakeCompanyNotifier()).execute(77, ''),
    ).rejects.toThrow(ValidationError);
  });
});
