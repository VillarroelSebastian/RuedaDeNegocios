/**
 * The rows the reporting context reads. Every driven port speaks in these, so
 * the domain never depends on how any other context stores what it owns.
 */

export interface ReportEvent {
  id: number;
  nombre: string;
  /** The window meetings of this event really run in. */
  inicio: Date;
  fin: Date;
}

export interface RecentEnrollment {
  empresaEventoId: number;
  empresa: string;
  rubro: string | null;
  tipoParticipacion: string | null;
  estadoPago: string;
  fechaRegistro: Date;
}

export interface SectorCount {
  rubro: string | null;
  empresas: number;
}

export interface CompanyHit {
  empresaEventoId: number;
  empresaId: number;
  codigo: string | null;
  nombre: string;
  rubro: string | null;
  ciudad: string | null;
  urlFotoPerfil: string | null;
  estadoPago: string;
  estadoHabilitacionAcceso: string;
}

/** A meeting as every report reads it: who, when, where and how it is going. */
export interface MeetingRow {
  id: number;
  inicio: Date;
  fin: Date;
  tipoReunion: string;
  estadoReunion: string;
  numeroMesa: number | null;
  solicitante: string | null;
  receptora: string | null;
}

export interface CompanyNextMeeting {
  id: number;
  inicio: Date;
  fin: Date;
  tipo: string;
  estado: string;
  numeroMesa: number | null;
  contraparte: string | null;
  enlace: string | null;
}

export interface TableRow {
  id: number;
  numero: number;
  activa: boolean;
}

export interface ActivityRow {
  id: number;
  nombre: string;
  /** Calendar day, stored and read in UTC. */
  fecha: Date;
  /** Room clock time, stored and read in UTC. */
  hora: Date;
  tipo: string | null;
  sala: string | null;
}

export interface NewsRow {
  id: number;
  titulo: string;
  tipo: string | null;
  fecha: Date | null;
}

/** A company as the roster export lists it. */
export interface RosterRow {
  nombre: string;
  rubro: string | null;
  ciudad: string | null;
  pais: string | null;
  participantes: number;
  cuposPagados: number;
  estadoPago: string;
  acceso: string;
  fechaRegistro: Date | null;
}

/** One reported outcome, as the results export lists it. */
export interface ResultRow {
  fechaReunion: Date | null;
  numeroMesa: number | null;
  empresaCalificadora: string | null;
  empresaCalificada: string | null;
  calificacion: number;
  rangoAcuerdo: string | null;
  observaciones: string | null;
  registradoPor: string | null;
}
