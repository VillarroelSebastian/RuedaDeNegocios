import type {
  CommercialProfile,
  CommercialProfilePatch,
  CompanyBasicsPatch,
  CompanyDossier,
  CompanyListFilters,
  CompanyListItem,
  CompanyParticipant,
  CompanyRepositoryPort,
  DirectoryEntry,
  OwnCompanyView,
  OwnProfilePatch,
  Paginated,
} from './domain/ports/company.repository.port.js';

type DirectoryRow = Omit<DirectoryEntry, 'afinidad'>;

export function buildOwnCompanyView(overrides: Partial<OwnCompanyView> = {}): OwnCompanyView {
  return {
    empresaUsuarioId: 10,
    empresaeventoId: 100,
    cargo: 'Gerente',
    esResponsable: true,
    urlCredencialQR: '/uploads/qr/10.png',
    usuario: {
      id: 1,
      nombres: 'Ana',
      apellidoPaterno: 'Perez',
      apellidoMaterno: 'Lopez',
      correo: 'ana@test.com',
      telefono: '70000000',
      rolEvento: 'EMPRESA',
      urlFotoPerfil: '/uploads/perfil/ana.png',
    },
    empresa: {
      id: 5,
      nombre: 'Beni Agro',
      rubro: 'Agroindustria',
      codigo: 'EMP-005',
      correoCorporativo: 'contacto@beniagro.test',
      telefonoWhatsapp: '70111111',
      sitioWeb: null,
      descripcion: null,
      urlFotoPerfil: null,
      oferta: 'Granos',
      demanda: 'Logística',
      interesesBusqueda: null,
    },
    estadoPago: 'COMPLETADO',
    estadoAcceso: 'HABILITADO',
    tipoParticipacion: 'PRESENCIAL',
    horariosConfigurados: true,
    numeroParticipantes: 2,
    ...overrides,
  };
}

export function buildDirectoryRow(overrides: Partial<DirectoryRow> = {}): DirectoryRow {
  return {
    empresaeventoId: 101,
    empresaId: 6,
    codigo: 'EMP-006',
    nombre: 'Trans Beni',
    rubro: 'Logística, Transporte y Comercio Exterior',
    descripcion: null,
    oferta: 'Transporte',
    demanda: 'Carga',
    urlFotoPerfil: null,
    sitioWeb: null,
    urlPdf: null,
    correoCorporativo: 'contacto@transbeni.test',
    telefonoWhatsapp: '70222222',
    ciudad: 'Trinidad',
    pais: 'Bolivia',
    tipoParticipacion: 'PRESENCIAL',
    paquete: 'Oro',
    nivelMesa: 'PREMIUM',
    destacado: false,
    ...overrides,
  };
}

export class FakeCompanyRepository implements CompanyRepositoryPort {
  basicsPatches: { companyId: number; patch: CompanyBasicsPatch }[] = [];
  commercialPatches: { companyId: number; patch: CommercialProfilePatch }[] = [];
  logoUpdates: { companyId: number; url: string }[] = [];
  profilePatches: { companyUserId: number; patch: OwnProfilePatch }[] = [];
  deactivated: number[] = [];
  listCalls: CompanyListFilters[] = [];

  constructor(
    private readonly options: {
      page?: Paginated<CompanyListItem>;
      dossier?: CompanyDossier | null;
      participants?: CompanyParticipant[];
      ownCompany?: OwnCompanyView | null;
      sector?: string | null;
      directory?: DirectoryRow[];
      directoryEntry?: DirectoryRow | null;
    } = {},
  ) {}

  async list(filters: CompanyListFilters): Promise<Paginated<CompanyListItem>> {
    this.listCalls.push(filters);
    return this.options.page ?? { data: [], total: 0, page: filters.page, limit: filters.limit };
  }

  async findDossier(): Promise<CompanyDossier | null> {
    return this.options.dossier ?? null;
  }

  async findParticipants(): Promise<CompanyParticipant[]> {
    return this.options.participants ?? [];
  }

  async updateBasics(companyId: number, patch: CompanyBasicsPatch): Promise<CompanyDossier | null> {
    this.basicsPatches.push({ companyId, patch });
    return this.options.dossier ?? null;
  }

  async deactivateEnrollment(companyId: number): Promise<{ enrollments: number; participants: number }> {
    this.deactivated.push(companyId);
    return { enrollments: 1, participants: 2 };
  }

  async findOwnCompany(): Promise<OwnCompanyView | null> {
    return this.options.ownCompany ?? null;
  }

  async findSector(): Promise<string | null> {
    return this.options.sector ?? null;
  }

  async listDirectory(): Promise<DirectoryRow[]> {
    return this.options.directory ?? [];
  }

  async findDirectoryEntry(): Promise<DirectoryRow | null> {
    return this.options.directoryEntry ?? null;
  }

  async updateCommercialProfile(
    companyId: number,
    patch: CommercialProfilePatch,
  ): Promise<CommercialProfile> {
    this.commercialPatches.push({ companyId, patch });
    return { id: companyId, codigo: 'EMP-005', ...patch } as CommercialProfile;
  }

  async updateLogo(companyId: number, url: string) {
    this.logoUpdates.push({ companyId, url });
    return { id: companyId, urlFotoPerfil: url };
  }

  async updateOwnProfile(companyUserId: number, patch: OwnProfilePatch) {
    this.profilePatches.push({ companyUserId, patch });
    return { ...buildOwnCompanyView().usuario, ...patch } as OwnCompanyView['usuario'];
  }
}
