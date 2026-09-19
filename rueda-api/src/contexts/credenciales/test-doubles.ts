import type {
  BadgeTarget,
  CredentialView,
  CredentialsRepositoryPort,
  PrintableCredential,
  PrintableEvent,
} from './domain/ports/credentials.repository.port.js';

export function buildCredentialView(overrides: Partial<CredentialView> = {}): CredentialView {
  return {
    valida: true,
    habilitado: true,
    participante: {
      nombre: 'Ana Perez Lopez',
      urlFotoPerfil: '/uploads/perfil/ana.png',
      cargo: 'Gerente',
      esResponsable: true,
    },
    empresa: {
      empresaEventoId: 100,
      nombre: 'Beni Agro',
      codigo: 'EMP-005',
      rubro: 'Agroindustria',
      urlFotoPerfil: null,
      ciudad: 'Trinidad',
      pais: 'Bolivia',
    },
    evento: {
      nombre: 'Rueda de Negocios',
      edicion: 'VIII',
      fechaInicio: new Date('2026-11-03T12:00:00.000Z'),
      fechaFin: new Date('2026-11-04T22:00:00.000Z'),
      urlLogoEvento: '/uploads/logo.png',
      ciudad: 'Trinidad',
      pais: 'Bolivia',
    },
    tipoParticipacion: 'PRESENCIAL',
    ...overrides,
  };
}

export const PRINTABLE_EVENT: PrintableEvent = {
  nombre: 'Rueda de Negocios',
  edicion: 'VIII',
  urlLogoEvento: '/uploads/logo.png',
};

export class FakeCredentialsRepository implements CredentialsRepositoryPort {
  printableCalls: number[][] = [];
  printableTargetCalls: (number | undefined)[] = [];

  constructor(
    private readonly options: {
      view?: CredentialView | null;
      granted?: BadgeTarget[];
      printableTargets?: BadgeTarget[];
      printable?: PrintableCredential[];
      event?: PrintableEvent | null;
    } = {},
  ) {}

  async findCredentialView(): Promise<CredentialView | null> {
    return this.options.view ?? null;
  }

  async listGrantedTargets(): Promise<BadgeTarget[]> {
    return this.options.granted ?? [];
  }

  async listPrintableTargets(companyUserId?: number): Promise<BadgeTarget[]> {
    this.printableTargetCalls.push(companyUserId);
    return this.options.printableTargets ?? [];
  }

  async listPrintable(companyUserIds: number[]): Promise<PrintableCredential[]> {
    this.printableCalls.push(companyUserIds);
    return this.options.printable ?? [];
  }

  async findPrintableEvent(): Promise<PrintableEvent | null> {
    return this.options.event ?? null;
  }
}
