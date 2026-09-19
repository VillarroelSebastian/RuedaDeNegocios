import type { Paginated } from '../../../../shared/domain/pagination.js';
import type { Affinity } from '../services/sector-affinity.js';

export interface CompanyListFilters {
  search?: string;
  estadoPago?: string;
  ciudad?: string;
  rubro?: string;
  page: number;
  limit: number;
}

export interface CompanyListItem {
  id: number;
  nombre: string;
  codigo: string | null;
  rubro: string;
  ciudad: string;
  telefonoWhatsapp: string;
  correoCorporativo: string;
  urlFotoPerfil: string | null;
  sitioWeb: string | null;
  descripcion: string | null;
  fechaCreacion: Date;
  empresaEventoId: number | null;
  estadoVerificacionPago: string;
  estadoHabilitacionAcceso: string;
  numeroParticipantes: number;
  participantesRegistrados: number;
  montoPagado: number | null;
  tipoParticipacion: string | null;
  paquete: {
    id: number;
    nombre: string;
    costo: number;
    nivelMesa: string;
    credencialesIncluidas: number;
  } | null;
}

export type { Paginated };

export interface CompanyParticipant {
  id: number;
  usuarioId: number;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  correo: string | null;
  telefono: string | null;
  cargo: string | null;
  esResponsable: boolean;
  urlCredencialQR: string | null;
  estaActivo: number;
}

export interface CompanyReceipt {
  id: number;
  tipoPago: string;
  estadoPago: string;
  montoPago: number | null;
  cantidadParticipantes: number | null;
  observacion: string | null;
  url: string | null;
  fechaCreacion: Date;
}

/** The dossier the admin panel shows for one company in the running event. */
export interface CompanyDossier {
  id: number;
  nombre: string;
  rubro: string;
  codigo: string | null;
  sitioWeb: string | null;
  descripcion: string | null;
  telefonoWhatsapp: string;
  correoCorporativo: string;
  urlFotoPerfil: string | null;
  urlPdf: string | null;
  oferta: string | null;
  demanda: string | null;
  interesesBusqueda: string | null;
  estaActivo: number;
  fechaCreacion: Date;
  pais: string | null;
  ciudad: string | null;
  empresaEventoId: number | null;
  paquete: Record<string, unknown> | null;
  tipoParticipacion: string | null;
  numeroParticipantes: number;
  montoPagado: number | null;
  estadoVerificacionPago: string;
  estadoHabilitacionAcceso: string;
  motivoRechazoAcceso: string | null;
  fechaHoraEnvioComprobante: Date | null;
  participantes: CompanyParticipant[];
  comprobantes: CompanyReceipt[];
}

export interface CompanyBasicsPatch {
  nombre?: string;
  rubro?: string;
  sitioWeb?: string | null;
  descripcion?: string | null;
  telefonoWhatsapp?: string;
  correoCorporativo?: string;
  urlFotoPerfil?: string | null;
}

export interface CommercialProfilePatch {
  oferta?: string | null;
  demanda?: string | null;
  interesesBusqueda?: string | null;
}

export interface CommercialProfile {
  id: number;
  codigo: string | null;
  oferta: string | null;
  demanda: string | null;
  interesesBusqueda: string | null;
}

/** What a company user sees about itself. */
export interface OwnCompanyView {
  empresaUsuarioId: number;
  empresaeventoId: number;
  cargo: string | null;
  esResponsable: boolean;
  urlCredencialQR: string | null;
  usuario: {
    id: number;
    nombres: string;
    apellidoPaterno: string;
    apellidoMaterno: string | null;
    correo: string;
    telefono: string;
    rolEvento: string;
    urlFotoPerfil: string;
  };
  empresa: {
    id: number;
    nombre: string;
    rubro: string;
    codigo: string | null;
    correoCorporativo: string;
    telefonoWhatsapp: string;
    sitioWeb: string | null;
    descripcion: string | null;
    urlFotoPerfil: string | null;
    oferta: string | null;
    demanda: string | null;
    interesesBusqueda: string | null;
  };
  estadoPago: string;
  estadoAcceso: string;
  tipoParticipacion: string | null;
  horariosConfigurados: boolean;
  numeroParticipantes: number | null;
}

export interface DirectoryFilters {
  oferta?: string;
  demanda?: string;
  lugar?: string;
}

export interface DirectoryEntry {
  empresaeventoId: number;
  empresaId: number;
  codigo: string | null;
  nombre: string;
  rubro: string;
  descripcion: string | null;
  oferta: string | null;
  demanda: string | null;
  urlFotoPerfil: string | null;
  sitioWeb: string | null;
  urlPdf: string | null;
  correoCorporativo: string;
  telefonoWhatsapp: string;
  ciudad: string | null;
  pais: string | null;
  tipoParticipacion: string | null;
  paquete: string | null;
  nivelMesa: string;
  destacado: boolean;
  afinidad: Affinity;
}

export interface OwnProfilePatch {
  nombres?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string | null;
  telefono?: string;
  urlFotoPerfil?: string;
}

export interface CompanyRepositoryPort {
  list(filters: CompanyListFilters): Promise<Paginated<CompanyListItem>>;
  findDossier(companyId: number): Promise<CompanyDossier | null>;
  findParticipants(companyId: number): Promise<CompanyParticipant[]>;
  updateBasics(companyId: number, patch: CompanyBasicsPatch): Promise<CompanyDossier | null>;

  /** Deactivates the company's enrollment, its members and, if orphaned, itself. */
  deactivateEnrollment(companyId: number): Promise<{ enrollments: number; participants: number }>;

  /**
   * Resolves the caller's own membership in the running event from its user id.
   * Taking the user from the token instead of the request body is what makes
   * every `me` route inherently scoped to its caller.
   */
  findOwnCompany(userId: number): Promise<OwnCompanyView | null>;
  /** Sector of the company behind an enrollment, used to rank the directory. */
  findSector(companyEventId: number): Promise<string | null>;
  listDirectory(
    excludingCompanyEventId: number,
    filters: DirectoryFilters,
  ): Promise<Omit<DirectoryEntry, 'afinidad'>[]>;
  findDirectoryEntry(companyEventId: number): Promise<Omit<DirectoryEntry, 'afinidad'> | null>;

  updateCommercialProfile(
    companyId: number,
    patch: CommercialProfilePatch,
  ): Promise<CommercialProfile>;
  updateLogo(companyId: number, url: string): Promise<{ id: number; urlFotoPerfil: string | null }>;
  updateOwnProfile(
    companyUserId: number,
    patch: OwnProfilePatch,
  ): Promise<OwnCompanyView['usuario']>;
}

export const COMPANY_REPOSITORY = Symbol('CompanyRepositoryPort');
