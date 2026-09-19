import type { AttendanceEvent } from '../../../asistencias/domain/services/attendance-window.js';
import type { SponsorContribution } from '../services/sponsor-contribution.js';
import type { Representative } from '../services/sponsor-representatives.js';

export interface SponsorEvent extends AttendanceEvent {
  id: number;
  nombre: string;
  edicion: string;
  ciudadEvento: string | null;
  paisEvento: string | null;
}

export interface SponsorPerson {
  id: number;
  nombreCompleto: string;
  cargo: string | null;
  correo: string | null;
  urlCredencialQR: string | null;
}

export interface SponsorRecord {
  id: number;
  nombreEmpresa: string;
  descripcion: string | null;
  tipoAporte: string;
  montoAporte: number | null;
  detalleAporte: string | null;
  cantidadIngresos: number;
  paquete: { id: number; nombre: string; costo: number } | null;
  personas: SponsorPerson[];
}

/** One person of a sponsor, with everything their credential has to show. */
export interface SponsorPersonDetail {
  id: number;
  nombreCompleto: string;
  cargo: string | null;
  correo: string | null;
  sponsorId: number;
  nombreEmpresa: string;
  event: SponsorEvent;
}

export interface SponsorAttendanceRecord {
  id: number;
  fechaHoraAsistencia: Date;
  numeroUso: number;
  persona: { id: number; nombreCompleto: string; cargo: string | null };
  nombreEmpresa: string;
  lugar: string;
}

/** What granting a sponsor access to the platform ended up doing. */
export interface PlatformAccess {
  creado: boolean;
  motivo?: string;
  empresaEventoId?: number;
  /** Only when an account was created; it is emailed, never stored in the clear. */
  correo?: string;
  contraseniaTemporal?: string;
}

export interface SponsorsRepositoryPort {
  findPrincipalEvent(): Promise<SponsorEvent | null>;

  list(eventId: number): Promise<SponsorRecord[]>;
  find(sponsorId: number, eventId: number): Promise<SponsorRecord | null>;

  /**
   * An address already used by an account or by another sponsor's person.
   * Returns the offending address, or nothing when they are all free.
   */
  findTakenEmail(emails: string[], exceptSponsorId: number | null): Promise<string | null>;

  create(
    eventId: number,
    contribution: SponsorContribution,
    representatives: Representative[],
  ): Promise<SponsorRecord>;
  /**
   * Rewrites the sponsor and re-seats its people. The ones already there keep
   * their credential; only the new ones need one issued.
   */
  update(
    sponsorId: number,
    contribution: SponsorContribution,
    representatives: Representative[],
  ): Promise<{ sponsor: SponsorRecord; nuevas: SponsorPerson[] }>;
  deactivate(sponsorId: number): Promise<void>;

  findPerson(personId: number): Promise<SponsorPersonDetail | null>;
  setCredentialUrl(personId: number, url: string): Promise<void>;

  countAttendanceOn(eventId: number, personId: number, day: Date): Promise<number>;
  findRecentAttendance(
    eventId: number,
    personId: number,
    day: Date,
    since: Date,
  ): Promise<{ id: number; fechaHoraAsistencia: Date } | null>;
  /** Records the scan, re-counting inside the transaction so the daily limit holds. */
  recordAttendance(input: {
    eventId: number;
    personId: number;
    technicianId: number;
    day: Date;
    graceSince: Date;
  }): Promise<{ id: number; fechaHoraAsistencia: Date; usosHoy: number; duplicada: boolean }>;
  listAttendance(eventId: number, limit: number): Promise<SponsorAttendanceRecord[]>;

  /**
   * Gives the sponsor a company account so it can use the platform. Creates the
   * company, its enrollment, the user and the membership in one atomic step.
   */
  grantPlatformAccess(
    sponsorId: number,
    hashedPassword: string,
  ): Promise<PlatformAccess>;
}

export const SPONSORS_REPOSITORY = Symbol('SponsorsRepositoryPort');
