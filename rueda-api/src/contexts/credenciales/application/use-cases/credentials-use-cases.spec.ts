import { describe, expect, it } from 'vitest';
import type { Env } from '../../../../shared/config/env.schema.js';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/domain.error.js';
import { FakeCredentialIssuer } from '../../../participantes/test-doubles.js';
import { credentialTokenFor } from '../../domain/services/credential-token.js';
import {
  FakeCredentialsRepository,
  PRINTABLE_EVENT,
  buildCredentialView,
} from '../../test-doubles.js';
import { GetPrintableCredentialsUseCase } from './get-printable-credentials.use-case.js';
import { ReadCredentialUseCase } from './read-credential.use-case.js';
import { ReissueCredentialsUseCase } from './reissue-credentials.use-case.js';

const SECRET = 'a-secret-long-enough-for-testing';
const ENV = { JWT_SECRET: SECRET } as Env;
const VALID_TOKEN = credentialTokenFor(10, SECRET);

const target = (companyUserId: number, hasBadge = true) => ({
  companyUserId,
  fullName: `Persona ${companyUserId}`,
  hasBadge,
});

describe('ReadCredentialUseCase', () => {
  it('opens a badge presented with its own signature', async () => {
    const repository = new FakeCredentialsRepository({ view: buildCredentialView() });

    const view = await new ReadCredentialUseCase(repository, ENV).read(10, VALID_TOKEN);

    expect(view.empresa.nombre).toBe('Beni Agro');
  });

  it('refuses a missing signature', async () => {
    const repository = new FakeCredentialsRepository({ view: buildCredentialView() });

    await expect(new ReadCredentialUseCase(repository, ENV).read(10, undefined)).rejects.toThrow(
      ValidationError,
    );
  });

  it('refuses the signature of another membership', async () => {
    const repository = new FakeCredentialsRepository({ view: buildCredentialView() });

    await expect(
      new ReadCredentialUseCase(repository, ENV).read(10, credentialTokenFor(11, SECRET)),
    ).rejects.toThrow(/inválida o fue alterada/);
  });

  it('checks the signature before touching the database', async () => {
    const repository = new FakeCredentialsRepository({ view: null });

    // A wrong signature must not be distinguishable from a missing badge.
    await expect(new ReadCredentialUseCase(repository, ENV).read(10, 'nope')).rejects.toThrow(
      ValidationError,
    );
  });

  it('reports an unknown badge separately from a bad signature', async () => {
    const repository = new FakeCredentialsRepository({ view: null });

    await expect(new ReadCredentialUseCase(repository, ENV).read(10, VALID_TOKEN)).rejects.toThrow(
      NotFoundError,
    );
  });

  it('reports a participant whose company is not enabled', async () => {
    const repository = new FakeCredentialsRepository({
      view: buildCredentialView({ habilitado: false }),
    });

    const view = await new ReadCredentialUseCase(repository, ENV).read(10, VALID_TOKEN);

    expect(view.habilitado).toBe(false);
  });
});

describe('ReissueCredentialsUseCase', () => {
  it('renders a badge for every enabled membership', async () => {
    const repository = new FakeCredentialsRepository({ granted: [target(1), target(2)] });
    const issuer = new FakeCredentialIssuer();

    const summary = await new ReissueCredentialsUseCase(repository, issuer).execute();

    expect(summary).toEqual({ regeneradas: 2, fallidas: 0 });
    expect(issuer.issued).toHaveLength(2);
  });

  it('keeps going when one badge cannot be rendered', async () => {
    const repository = new FakeCredentialsRepository({ granted: [target(1), target(2)] });
    const issuer = new FakeCredentialIssuer();
    issuer.shouldFail = true;

    expect(await new ReissueCredentialsUseCase(repository, issuer).execute()).toEqual({
      regeneradas: 0,
      fallidas: 2,
    });
  });

  it('reports nothing done when no company is enabled', async () => {
    const repository = new FakeCredentialsRepository({ granted: [] });

    expect(
      await new ReissueCredentialsUseCase(repository, new FakeCredentialIssuer()).execute(),
    ).toEqual({ regeneradas: 0, fallidas: 0 });
  });
});

describe('GetPrintableCredentialsUseCase', () => {
  it('returns the card size so the sheet prints to scale', async () => {
    const repository = new FakeCredentialsRepository({ event: PRINTABLE_EVENT });

    const sheet = await new GetPrintableCredentialsUseCase(
      repository,
      new FakeCredentialIssuer(),
    ).execute();

    expect(sheet.medidaMm).toEqual({ ancho: 85.6, alto: 54 });
  });

  it('renders the badges that are still missing before listing', async () => {
    const repository = new FakeCredentialsRepository({
      event: PRINTABLE_EVENT,
      printableTargets: [target(1, true), target(2, false)],
    });
    const issuer = new FakeCredentialIssuer();

    await new GetPrintableCredentialsUseCase(repository, issuer).execute();

    expect(issuer.issued).toEqual([{ companyUserId: 2, fullName: 'Persona 2' }]);
    expect(repository.printableCalls).toEqual([[1, 2]]);
  });

  it('narrows the sheet to one participant when asked', async () => {
    const repository = new FakeCredentialsRepository({
      event: PRINTABLE_EVENT,
      printableTargets: [target(7)],
    });

    await new GetPrintableCredentialsUseCase(repository, new FakeCredentialIssuer()).execute(7);

    expect(repository.printableTargetCalls).toEqual([7]);
  });

  it('answers an empty sheet when no event is published', async () => {
    const repository = new FakeCredentialsRepository({ event: null });

    expect(
      await new GetPrintableCredentialsUseCase(repository, new FakeCredentialIssuer()).execute(),
    ).toMatchObject({ evento: null, credenciales: [] });
  });

  it('still lists the sheet when a badge cannot be rendered', async () => {
    const repository = new FakeCredentialsRepository({
      event: PRINTABLE_EVENT,
      printableTargets: [target(2, false)],
    });
    const issuer = new FakeCredentialIssuer();
    issuer.shouldFail = true;

    const sheet = await new GetPrintableCredentialsUseCase(repository, issuer).execute();

    expect(sheet.evento).toEqual(PRINTABLE_EVENT);
  });
});
