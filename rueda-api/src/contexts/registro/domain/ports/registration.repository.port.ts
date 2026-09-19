import type { CompanyApplication } from '../services/company-application.js';
import type { PricedEnrollment, RegistrationPackage } from '../services/enrollment-pricing.js';
import type { ParticipantApplication } from '../services/participant-application.js';

/** The event taking registrations, with the period it accepts them in. */
export interface RegistrationEvent {
  id: number;
  nombre: string | null;
  fechaInicioSolicitudes: Date | null;
  fechaFinSolicitudes: Date | null;
}

export interface CityOption {
  id: number;
  nombre: string;
  pais: { id: number; nombre: string };
}

/** A company that already exists, and whether it is in this event already. */
export interface KnownCompany {
  id: number;
  nombre: string;
  enrolledInEvent: boolean;
}

export interface KnownAccount {
  id: number;
  correo: string;
  rolEvento: string;
  /** Whether the account already takes part in this event. */
  enrolledInEvent: boolean;
}

/** A phone already in use inside the event, and who holds it. */
export interface TakenPhone {
  userId: number;
  telefonoDigits: string;
}

/** A participant of the submitted roster, resolved against existing accounts. */
export interface ParticipantToCreate extends ParticipantApplication {
  /** Set when the person already has an account that is reused. */
  existingUserId: number | null;
  /** Only a brand new account needs one. */
  hashedPassword: string | null;
  urlFotoPerfil: string;
}

export interface RegistrationData {
  eventId: number;
  /** Set when the corporate email already belongs to a company. */
  existingCompanyId: number | null;
  empresa: CompanyApplication;
  priced: PricedEnrollment;
  urlComprobante: string | null;
  participantes: ParticipantToCreate[];
}

export interface RegisteredParticipant {
  companyUserId: number;
  userId: number;
  nombres: string;
  apellidoPaterno: string;
  correo: string;
  cargo: string;
  esResponsable: boolean;
  /** True when an existing account was linked instead of a new one created. */
  reutilizado: boolean;
}

export interface RegisteredEnrollment {
  companyEventId: number;
  companyId: number;
  companyName: string;
  companyCode: string;
  numeroParticipantes: number;
  montoPagado: number;
  estadoVerificacionPago: string;
  tipoParticipacion: string;
  participantes: RegisteredParticipant[];
}

/** What the company sees when it follows its registration without an account. */
export interface TrackedEnrollment {
  id: number;
  empresa: {
    nombre: string;
    rubro: string;
    correoCorporativo: string;
    urlFotoPerfil: string | null;
  };
  evento: { nombre: string | null; urlLogoEvento: string | null };
  estadoVerificacionPago: string;
  estadoHabilitacionAcceso: string;
  observacionSobreComprobante: string | null;
  montoPagado: number | null;
  tipoParticipacion: string;
  numeroParticipantes: number;
  fechaHoraEnvioComprobante: Date | null;
  urlComprobante: string | null;
  encargado: { nombres: string; apellidoPaterno: string; correo: string } | null;
  participantes: {
    nombres: string;
    apellidoPaterno: string;
    correo: string;
    cargo: string | null;
    esResponsable: boolean;
  }[];
}

export interface RegistrationRepositoryPort {
  findPrincipalEvent(): Promise<RegistrationEvent | null>;
  listCities(): Promise<CityOption[]>;
  findPackage(eventId: number, packageId: number): Promise<RegistrationPackage | null>;

  /** The active company holding that corporate email, in this event or not. */
  findCompanyByEmail(eventId: number, email: string): Promise<KnownCompany | null>;
  /** A company of this event reachable at that number, other than `exceptCompanyId`. */
  findCompanyByPhone(
    eventId: number,
    telefonoDigits: string,
    exceptCompanyId: number | null,
  ): Promise<{ id: number; nombre: string } | null>;

  findAccountsByEmail(emails: string[], eventId: number): Promise<KnownAccount[]>;
  /** Every phone taking part in the event, normalised, with its holder. */
  listParticipantPhones(eventId: number): Promise<TakenPhone[]>;
  /** Whether that number already belongs to somebody other than `exceptEmail`. */
  isParticipantPhoneTaken(
    eventId: number,
    telefonoDigits: string,
    exceptEmail: string,
  ): Promise<boolean>;

  /**
   * Creates the company, its enrollment, its receipt and its people in one
   * atomic step: a duplicate must never leave an enrollment without members.
   */
  register(data: RegistrationData): Promise<RegisteredEnrollment>;

  findTracking(companyEventId: number): Promise<TrackedEnrollment | null>;
  findReceiptTarget(
    companyEventId: number,
  ): Promise<{ id: number; estadoVerificacionPago: string } | null>;
  /** Replaces the receipt on file and puts the payment back under review. */
  replaceReceipt(companyEventId: number, urlComprobante: string): Promise<void>;
}

export const REGISTRATION_REPOSITORY = Symbol('RegistrationRepositoryPort');
