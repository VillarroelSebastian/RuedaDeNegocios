import type { EventSettings } from './domain/services/event-settings.js';
import type {
  EventConfigPatch,
  EventRecord,
  EventRepositoryPort,
  EventStats,
  QrRule,
} from './domain/ports/event.repository.port.js';
import type { TableProvisioningPort } from './domain/ports/table-provisioning.port.js';

export function buildEventRecord(overrides: Partial<EventRecord> = {}): EventRecord {
  return {
    id: 1,
    nombre: 'Rueda de Negocios',
    edicion: 'VIII',
    descripcion: null,
    fechaInicioEvento: new Date('2026-11-03T12:00:00.000Z'),
    fechaFinEvento: new Date('2026-11-04T22:00:00.000Z'),
    fechaInicioSolicitudes: null,
    fechaFinSolicitudes: null,
    duracionReunion: 20,
    tiempoEntreReuniones: 5,
    horariosReunionJson: null,
    cantidadTotalMesasEvento: 50,
    capacidadPersonasPorMesa: 4,
    montoBaseIncripcionBolivianos: 500,
    cantidadParticipantesIncluidos: 2,
    costoParticipanteExtra: 100,
    maxParticipantesPorEmpresa: 5,
    urlImagenMapaRecinto: null,
    urlImagenCronogramaCharlas: null,
    urlLogoEvento: '/uploads/logo.png',
    sobreElEvento: null,
    urlVideoEvento: null,
    pilaresEvento: null,
    correoContacto: null,
    telefonoContacto: null,
    enlaceFacebook: null,
    enlaceInstagram: null,
    enlaceLinkedIn: null,
    enlaceTiktok: null,
    ciudadEvento: 'Trinidad',
    paisEvento: 'Bolivia',
    estaActivo: 1,
    esPrincipal: 1,
    fechaCreacion: new Date('2026-09-01T00:00:00.000Z'),
    creadoModificadoFecha: null,
    ...overrides,
  };
}

export const EMPTY_STATS: EventStats = {
  empresasCount: 0,
  mesasCount: 0,
  actividadesCount: 0,
  tecnicosCount: 0,
};

export class FakeEventRepository implements EventRepositoryPort {
  created: { settings: EventSettings; qrRules: QrRule[] }[] = [];
  updated: { id: number; settings: EventSettings }[] = [];
  replacedQrRules: { eventId: number; qrRules: QrRule[] }[] = [];
  patched: { id: number; patch: EventConfigPatch }[] = [];
  madePrincipal: number[] = [];
  deactivated: number[] = [];

  constructor(
    private readonly events: EventRecord[] = [],
    private readonly activePackages = 1,
    private readonly stats: EventStats = EMPTY_STATS,
  ) {}

  async findPrincipal(): Promise<EventRecord | null> {
    return this.events.find((event) => event.esPrincipal === 1 && event.estaActivo !== 0) ?? null;
  }

  async findById(id: number): Promise<EventRecord | null> {
    return this.events.find((event) => event.id === id) ?? null;
  }

  async listActive(): Promise<EventRecord[]> {
    return this.events.filter((event) => event.estaActivo !== 0);
  }

  async create(settings: EventSettings, qrRules: QrRule[]): Promise<EventRecord> {
    this.created.push({ settings, qrRules });
    return buildEventRecord({ id: 99, esPrincipal: 0, ...toRecordShape(settings) });
  }

  async update(id: number, settings: EventSettings): Promise<void> {
    this.updated.push({ id, settings });
  }

  async replaceQrRules(eventId: number, qrRules: QrRule[]): Promise<void> {
    this.replacedQrRules.push({ eventId, qrRules });
  }

  async patchConfig(id: number, patch: EventConfigPatch): Promise<EventRecord> {
    this.patched.push({ id, patch });
    return buildEventRecord({ id, ...patch });
  }

  async makePrincipal(id: number): Promise<EventRecord> {
    this.madePrincipal.push(id);
    return buildEventRecord({ id, esPrincipal: 1 });
  }

  async deactivate(id: number): Promise<void> {
    this.deactivated.push(id);
  }

  async countActivePackages(): Promise<number> {
    return this.activePackages;
  }

  async statsFor(): Promise<EventStats> {
    return this.stats;
  }
}

export class FakeTableProvisioning implements TableProvisioningPort {
  readonly calls: { eventId: number; total: number; capacityPerTable: number }[] = [];

  async syncTables(eventId: number, total: number, capacityPerTable: number): Promise<void> {
    this.calls.push({ eventId, total, capacityPerTable });
  }
}

/** Projects the settings that overlap the stored record, for fake returns. */
function toRecordShape(settings: EventSettings): Partial<EventRecord> {
  const { horariosReunionJson, ...rest } = settings;
  return { ...rest, horariosReunionJson: horariosReunionJson ?? null };
}
