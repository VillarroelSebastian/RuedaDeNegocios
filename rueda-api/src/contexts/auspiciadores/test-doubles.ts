import type { Env } from '../../shared/config/env.schema.js';
import type {
  SponsorCredentialIssuerPort,
  SponsorCredentialEmail,
  SponsorNotifierPort,
  PlatformAccessEmail,
} from './application/ports/sponsor-credential.port.js';
import type {
  PlatformAccess,
  SponsorAttendanceRecord,
  SponsorEvent,
  SponsorPerson,
  SponsorPersonDetail,
  SponsorRecord,
  SponsorsRepositoryPort,
} from './domain/ports/sponsors.repository.port.js';
import type { SponsorContribution } from './domain/services/sponsor-contribution.js';
import type { Representative } from './domain/services/sponsor-representatives.js';

/**
 * In-memory doubles for the sponsors context. They implement the ports
 * literally so the use-case tests exercise real behaviour without a database.
 */

export const SECRET = 'a-very-long-development-secret-value';
export const ENV = { JWT_SECRET: SECRET } as Env;

export const EVENT: SponsorEvent = {
  id: 7,
  nombre: 'Rueda de Negocios',
  edicion: 'X',
  ciudadEvento: 'Trinidad',
  paisEvento: 'Bolivia',
  startsAt: new Date('2026-11-10T12:00:00.000Z'),
  endsAt: new Date('2026-11-12T22:00:00.000Z'),
};

export const SPONSOR_ID = 5;
export const PERSON_ID = 11;

export function buildPerson(overrides: Partial<SponsorPerson> = {}): SponsorPerson {
  return {
    id: PERSON_ID,
    nombreCompleto: 'Ana Perez',
    cargo: 'Gerente',
    correo: 'ana@test.com',
    urlCredencialQR: null,
    ...overrides,
  };
}

export function buildSponsor(overrides: Partial<SponsorRecord> = {}): SponsorRecord {
  return {
    id: SPONSOR_ID,
    nombreEmpresa: 'Banco Beni',
    descripcion: 'Banca regional',
    tipoAporte: 'DINERO',
    montoAporte: 5000,
    detalleAporte: null,
    cantidadIngresos: 1,
    paquete: null,
    personas: [buildPerson()],
    ...overrides,
  };
}

export function buildPersonDetail(
  overrides: Partial<SponsorPersonDetail> = {},
): SponsorPersonDetail {
  return {
    id: PERSON_ID,
    nombreCompleto: 'Ana Perez',
    cargo: 'Gerente',
    correo: 'ana@test.com',
    sponsorId: SPONSOR_ID,
    nombreEmpresa: 'Banco Beni',
    event: EVENT,
    ...overrides,
  };
}

export function buildSponsorBody(overrides: Record<string, unknown> = {}) {
  return {
    nombreEmpresa: 'Banco Beni',
    descripcion: 'Banca regional',
    tipoAporte: 'DINERO',
    montoAporte: 5000,
    cantidadIngresos: 1,
    personas: [{ nombreCompleto: 'Ana Perez', cargo: 'Gerente', correo: 'ana@test.com' }],
    ...overrides,
  };
}

export interface FakeSponsorsOptions {
  event?: SponsorEvent | null;
  sponsor?: SponsorRecord | null;
  sponsors?: SponsorRecord[];
  takenEmail?: string | null;
  person?: SponsorPersonDetail | null;
  usosHoy?: number;
  recent?: { id: number; fechaHoraAsistencia: Date } | null;
  duplicada?: boolean;
  access?: PlatformAccess;
  attendance?: SponsorAttendanceRecord[];
}

export class FakeSponsorsRepository implements SponsorsRepositoryPort {
  readonly created: { eventId: number; contribution: SponsorContribution; people: Representative[] }[] =
    [];
  readonly updated: {
    sponsorId: number;
    contribution: SponsorContribution;
    people: Representative[];
  }[] = [];
  readonly deactivated: number[] = [];
  readonly credentialUrls: { personId: number; url: string }[] = [];
  readonly recorded: unknown[] = [];
  readonly granted: { sponsorId: number; hashedPassword: string }[] = [];

  constructor(private readonly options: FakeSponsorsOptions = {}) {}

  async findPrincipalEvent(): Promise<SponsorEvent | null> {
    return this.options.event === undefined ? EVENT : this.options.event;
  }

  async list(): Promise<SponsorRecord[]> {
    return this.options.sponsors ?? [buildSponsor()];
  }

  async find(): Promise<SponsorRecord | null> {
    return this.options.sponsor === undefined ? buildSponsor() : this.options.sponsor;
  }

  async findTakenEmail(): Promise<string | null> {
    return this.options.takenEmail ?? null;
  }

  async create(
    eventId: number,
    contribution: SponsorContribution,
    people: Representative[],
  ): Promise<SponsorRecord> {
    this.created.push({ eventId, contribution, people });
    return buildSponsor({ nombreEmpresa: contribution.nombreEmpresa });
  }

  async update(
    sponsorId: number,
    contribution: SponsorContribution,
    people: Representative[],
  ): Promise<{ sponsor: SponsorRecord; nuevas: SponsorPerson[] }> {
    this.updated.push({ sponsorId, contribution, people });
    return { sponsor: buildSponsor({ id: sponsorId }), nuevas: [buildPerson({ id: 12 })] };
  }

  async deactivate(sponsorId: number): Promise<void> {
    this.deactivated.push(sponsorId);
  }

  async findPerson(): Promise<SponsorPersonDetail | null> {
    return this.options.person === undefined ? buildPersonDetail() : this.options.person;
  }

  async setCredentialUrl(personId: number, url: string): Promise<void> {
    this.credentialUrls.push({ personId, url });
  }

  async countAttendanceOn(): Promise<number> {
    return this.options.usosHoy ?? 0;
  }

  async findRecentAttendance(): Promise<{ id: number; fechaHoraAsistencia: Date } | null> {
    return this.options.recent ?? null;
  }

  async recordAttendance(input: unknown): Promise<{
    id: number;
    fechaHoraAsistencia: Date;
    usosHoy: number;
    duplicada: boolean;
  }> {
    this.recorded.push(input);
    return {
      id: 1,
      fechaHoraAsistencia: new Date('2026-11-10T14:00:00.000Z'),
      usosHoy: (this.options.usosHoy ?? 0) + 1,
      duplicada: this.options.duplicada ?? false,
    };
  }

  async listAttendance(): Promise<SponsorAttendanceRecord[]> {
    return this.options.attendance ?? [];
  }

  async grantPlatformAccess(sponsorId: number, hashedPassword: string): Promise<PlatformAccess> {
    this.granted.push({ sponsorId, hashedPassword });
    return this.options.access ?? { creado: true, empresaEventoId: 100, correo: 'ana@test.com' };
  }
}

export class FakeSponsorCredentialIssuer implements SponsorCredentialIssuerPort {
  readonly issued: number[] = [];
  fails = false;

  async issueFor(personId: number): Promise<string> {
    if (this.fails) throw new Error('QR service unavailable');
    this.issued.push(personId);
    return `https://cdn.test/credencial-${personId}.png`;
  }
}

export class FakeSponsorNotifier implements SponsorNotifierPort {
  readonly credentials: SponsorCredentialEmail[] = [];
  readonly accesses: PlatformAccessEmail[] = [];
  fails = false;

  async sendCredential(email: SponsorCredentialEmail): Promise<void> {
    if (this.fails) throw new Error('mail server down');
    this.credentials.push(email);
  }

  async sendPlatformAccess(email: PlatformAccessEmail): Promise<void> {
    this.accesses.push(email);
  }
}
