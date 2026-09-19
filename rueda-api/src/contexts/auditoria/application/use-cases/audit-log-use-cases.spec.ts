import { describe, expect, it } from 'vitest';
import { FakeAuditLogRepository, buildAuditEntry } from '../../test-doubles.js';
import { ListAuditLogUseCase } from './list-audit-log.use-case.js';

describe('ListAuditLogUseCase', () => {
  it('applies the default page and size', async () => {
    const repository = new FakeAuditLogRepository();

    await new ListAuditLogUseCase(repository).execute({});

    expect(repository.listCalls[0]).toMatchObject({ page: 1, limit: 50 });
  });

  it('keeps a valid page and size', async () => {
    const repository = new FakeAuditLogRepository();

    await new ListAuditLogUseCase(repository).execute({ page: 3, limit: 120 });

    expect(repository.listCalls[0]).toMatchObject({ page: 3, limit: 120 });
  });

  it('caps the page size at two hundred rows', async () => {
    const repository = new FakeAuditLogRepository();

    await new ListAuditLogUseCase(repository).execute({ limit: 5000 });

    expect(repository.listCalls[0]?.limit).toBe(200);
  });

  it('clamps a page below one', async () => {
    const repository = new FakeAuditLogRepository();

    await new ListAuditLogUseCase(repository).execute({ page: 0 });

    expect(repository.listCalls[0]?.page).toBe(1);
  });

  it('narrows the trail down to one actor when asked', async () => {
    const repository = new FakeAuditLogRepository();

    await new ListAuditLogUseCase(repository).execute({ usuarioId: 12 });

    expect(repository.listCalls[0]?.usuarioId).toBe(12);
  });

  it('reads the whole trail when no actor is given', async () => {
    const repository = new FakeAuditLogRepository();

    await new ListAuditLogUseCase(repository).execute({});

    expect(repository.listCalls[0]?.usuarioId).toBeUndefined();
  });

  it('returns the page the repository found', async () => {
    const entry = buildAuditEntry({ id: '99' });
    const repository = new FakeAuditLogRepository({
      page: { data: [entry], total: 431, page: 2, limit: 50 },
    });

    const result = await new ListAuditLogUseCase(repository).execute({ page: 2 });

    expect(result).toEqual({ data: [entry], total: 431, page: 2, limit: 50 });
  });
});
