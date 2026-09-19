/** What the public badge page shows. */
export interface CredentialView {
  valida: true;
  /** Whether the person and their company are cleared to enter the event. */
  habilitado: boolean;
  participante: {
    nombre: string;
    urlFotoPerfil: string | null;
    cargo: string | null;
    esResponsable: boolean;
  };
  empresa: {
    empresaEventoId: number;
    nombre: string;
    codigo: string | null;
    rubro: string | null;
    urlFotoPerfil: string | null;
    ciudad: string | null;
    pais: string | null;
  };
  evento: {
    nombre: string | null;
    edicion: string | null;
    fechaInicio: Date | null;
    fechaFin: Date | null;
    urlLogoEvento: string | null;
    ciudad: string | null;
    pais: string | null;
  };
  tipoParticipacion: string | null;
}

/** A membership whose badge may need to be rendered. */
export interface BadgeTarget {
  companyUserId: number;
  fullName: string;
  hasBadge: boolean;
}

export interface PrintableCredential {
  id: number;
  nombre: string;
  empresa: string;
  cargo: string | null;
  foto: string | null;
  qr: string | null;
}

export interface PrintableEvent {
  nombre: string;
  edicion: string;
  urlLogoEvento: string | null;
}

export interface CredentialsRepositoryPort {
  findCredentialView(companyUserId: number): Promise<CredentialView | null>;
  /** Memberships of companies that are enabled and paid up. */
  listGrantedTargets(): Promise<BadgeTarget[]>;
  /** Memberships with access enabled, optionally narrowed to one. */
  listPrintableTargets(companyUserId?: number): Promise<BadgeTarget[]>;
  listPrintable(companyUserIds: number[]): Promise<PrintableCredential[]>;
  findPrintableEvent(): Promise<PrintableEvent | null>;
}

export const CREDENTIALS_REPOSITORY = Symbol('CredentialsRepositoryPort');
