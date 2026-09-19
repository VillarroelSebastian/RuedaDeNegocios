/**
 * What the assistant knows about, in the shape it reads it. Every driven port
 * of this context speaks in these models, so the domain never has to reach into
 * the application layer to describe what it is talking about.
 */

export interface AssistantCompany {
  empresaeventoId: number;
  nombre: string;
  codigo: string | null;
  rubro: string | null;
  oferta: string | null;
}

export interface AssistantMeeting {
  inicio: Date;
  fin: Date;
  estadoReunion: string;
  tipoReunion: string;
  /** The other company of the meeting, seen from the caller's side. */
  contraparte: string | null;
  numeroMesa: number | null;
}

export interface AssistantActivity {
  nombreActividad: string;
  /** Calendar day, stored and read in UTC — it is a date, not an instant. */
  fechaActividad: Date;
  /** Room clock time, stored and read in UTC — it is a wall clock. */
  horaInicioActividad: Date;
  nombreSalaEspacio: string | null;
}

export interface AssistantNews {
  tituloNoticia: string;
  contenidoNoticia: string;
}

export interface AssistantEnrollmentStatus {
  paqueteNombre: string | null;
  estadoVerificacionPago: string;
  montoPagado: number | null;
  /** Seats already taken by registered participants. */
  participantesUsados: number;
  participantesTotales: number;
}

export interface AssistantTable {
  id: number;
  numeroMesa: number;
}

export interface EventBriefing {
  id: number;
  nombre: string;
  /** The operating window of the event, meeting logistics included. */
  inicio: Date;
  fin: Date;
  urlImagenMapaRecinto: string | null;
  urlImagenCronogramaCharlas: string | null;
}

export interface AgendaSuggestions {
  /** Start of each free slot, in time order. */
  slots: Date[];
  duracionMinutos: number;
}
