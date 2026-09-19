import type { EventSettings } from '../services/event-settings.js';

export interface QrRule {
  id?: number;
  rangoDesde: number;
  rangoHasta: number;
  monto: number;
  urlQR: string;
}

/** An event row, with its active QR rules when they were requested. */
export interface EventRecord {
  id: number;
  nombre: string;
  edicion: string;
  descripcion: string | null;
  fechaInicioEvento: Date;
  fechaFinEvento: Date;
  fechaInicioSolicitudes: Date | null;
  fechaFinSolicitudes: Date | null;
  duracionReunion: number;
  tiempoEntreReuniones: number;
  horariosReunionJson: string | null;
  cantidadTotalMesasEvento: number;
  capacidadPersonasPorMesa: number;
  montoBaseIncripcionBolivianos: number;
  cantidadParticipantesIncluidos: number;
  costoParticipanteExtra: number;
  maxParticipantesPorEmpresa: number;
  urlImagenMapaRecinto: string | null;
  urlImagenCronogramaCharlas: string | null;
  urlLogoEvento: string | null;
  sobreElEvento: string | null;
  urlVideoEvento: string | null;
  pilaresEvento: string | null;
  correoContacto: string | null;
  telefonoContacto: string | null;
  enlaceFacebook: string | null;
  enlaceInstagram: string | null;
  enlaceLinkedIn: string | null;
  enlaceTiktok: string | null;
  ciudadEvento: string | null;
  paisEvento: string | null;
  estaActivo: number;
  esPrincipal: number;
  fechaCreacion: Date;
  creadoModificadoFecha: Date | null;
  reglasQR?: QrRule[];
}

/** Counters shown on the public landing page. */
export interface EventStats {
  empresasCount: number;
  mesasCount: number;
  actividadesCount: number;
  tecnicosCount: number;
}

/** Fields the quick-config screen may change on the principal event. */
export type EventConfigPatch = Partial<
  Pick<
    EventSettings,
    | 'duracionReunion'
    | 'tiempoEntreReuniones'
    | 'maxParticipantesPorEmpresa'
    | 'costoParticipanteExtra'
    | 'cantidadParticipantesIncluidos'
    | 'montoBaseIncripcionBolivianos'
  >
>;

export interface EventRepositoryPort {
  findPrincipal(): Promise<EventRecord | null>;
  findById(id: number, options?: { withQrRules?: boolean }): Promise<EventRecord | null>;
  listActive(): Promise<EventRecord[]>;

  create(settings: EventSettings, qrRules: QrRule[]): Promise<EventRecord>;
  update(id: number, settings: EventSettings): Promise<void>;
  replaceQrRules(eventId: number, qrRules: QrRule[]): Promise<void>;
  patchConfig(id: number, patch: EventConfigPatch): Promise<EventRecord>;

  /** Marks one event as principal and clears the flag on every other. */
  makePrincipal(id: number): Promise<EventRecord>;
  deactivate(id: number): Promise<void>;

  countActivePackages(eventId: number): Promise<number>;
  statsFor(event: EventRecord): Promise<EventStats>;
}

export const EVENT_REPOSITORY = Symbol('EventRepositoryPort');
