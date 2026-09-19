import type {
  RegistrationNotifierPort,
  SubmissionReceiptEmail,
} from './application/ports/registration-notifier.port.js';
import type {
  CityOption,
  KnownAccount,
  KnownCompany,
  RegisteredEnrollment,
  RegistrationData,
  RegistrationEvent,
  RegistrationRepositoryPort,
  TakenPhone,
  TrackedEnrollment,
} from './domain/ports/registration.repository.port.js';
import type { RegistrationPackage } from './domain/services/enrollment-pricing.js';

/**
 * In-memory doubles for the registration context. They implement the ports
 * literally, so the use-case tests exercise real behaviour without a database.
 */

export const EVENT: RegistrationEvent = {
  id: 7,
  nombre: 'Rueda de Negocios',
  fechaInicioSolicitudes: null,
  fechaFinSolicitudes: null,
};

export const PACKAGE: RegistrationPackage = {
  id: 3,
  costo: 1500,
  credencialesIncluidas: 2,
  tipoParticipacion: 'PRESENCIAL',
};

export function buildCompanyApplicationBody(overrides: Record<string, unknown> = {}) {
  return {
    nombre: 'Agro Beni SRL',
    rubro: 'Agropecuaria',
    correoCorporativo: 'contacto@agrobeni.com',
    telefonoWhatsapp: '+591 70011223',
    ...overrides,
  };
}

export function buildParticipantBody(overrides: Record<string, unknown> = {}) {
  return {
    nombres: 'Ana',
    apellidoPaterno: 'Perez',
    correo: 'ana@test.com',
    telefono: '70011223',
    cargo: 'Gerente',
    esResponsable: true,
    ...overrides,
  };
}

export const TRACKED: TrackedEnrollment = {
  id: 100,
  empresa: {
    nombre: 'Agro Beni SRL',
    rubro: 'Agropecuaria',
    correoCorporativo: 'contacto@agrobeni.com',
    urlFotoPerfil: null,
  },
  evento: { nombre: 'Rueda de Negocios', urlLogoEvento: null },
  estadoVerificacionPago: 'PENDIENTE',
  estadoHabilitacionAcceso: 'NO_HABILITADO',
  observacionSobreComprobante: null,
  montoPagado: 1500,
  tipoParticipacion: 'PRESENCIAL',
  numeroParticipantes: 2,
  fechaHoraEnvioComprobante: new Date('2026-09-18T12:00:00.000Z'),
  urlComprobante: '/uploads/comprobante.pdf',
  encargado: { nombres: 'Ana', apellidoPaterno: 'Perez', correo: 'ana@test.com' },
  participantes: [
    {
      nombres: 'Ana',
      apellidoPaterno: 'Perez',
      correo: 'ana@test.com',
      cargo: 'Gerente',
      esResponsable: true,
    },
  ],
};

export interface FakeRegistrationOptions {
  event?: RegistrationEvent | null;
  cities?: CityOption[];
  registrationPackage?: RegistrationPackage | null;
  company?: KnownCompany | null;
  companyByPhone?: { id: number; nombre: string } | null;
  accounts?: KnownAccount[];
  phones?: TakenPhone[];
  participantPhoneTaken?: boolean;
  tracked?: TrackedEnrollment | null;
  receiptTarget?: { id: number; estadoVerificacionPago: string } | null;
}

export class FakeRegistrationRepository implements RegistrationRepositoryPort {
  readonly registered: RegistrationData[] = [];
  readonly replacedReceipts: { companyEventId: number; urlComprobante: string }[] = [];

  constructor(private readonly options: FakeRegistrationOptions = {}) {}

  async findPrincipalEvent(): Promise<RegistrationEvent | null> {
    return this.options.event === undefined ? EVENT : this.options.event;
  }

  async listCities(): Promise<CityOption[]> {
    return this.options.cities ?? [];
  }

  async findPackage(): Promise<RegistrationPackage | null> {
    return this.options.registrationPackage === undefined
      ? PACKAGE
      : this.options.registrationPackage;
  }

  async findCompanyByEmail(): Promise<KnownCompany | null> {
    return this.options.company ?? null;
  }

  async findCompanyByPhone(): Promise<{ id: number; nombre: string } | null> {
    return this.options.companyByPhone ?? null;
  }

  async findAccountsByEmail(): Promise<KnownAccount[]> {
    return this.options.accounts ?? [];
  }

  async listParticipantPhones(): Promise<TakenPhone[]> {
    return this.options.phones ?? [];
  }

  async isParticipantPhoneTaken(): Promise<boolean> {
    return this.options.participantPhoneTaken ?? false;
  }

  async register(data: RegistrationData): Promise<RegisteredEnrollment> {
    this.registered.push(data);

    return {
      companyEventId: 100,
      companyId: data.existingCompanyId ?? 5,
      companyName: data.empresa.nombre,
      companyCode: 'RB-AB-0005',
      numeroParticipantes: data.priced.numeroParticipantes,
      montoPagado: data.priced.montoPagado,
      estadoVerificacionPago: 'PENDIENTE',
      tipoParticipacion: data.priced.tipoParticipacion,
      participantes: data.participantes.map((participant, index) => ({
        companyUserId: 10 + index,
        userId: participant.existingUserId ?? 1 + index,
        nombres: participant.nombres,
        apellidoPaterno: participant.apellidoPaterno,
        correo: participant.correo,
        cargo: participant.cargo,
        esResponsable: participant.esResponsable,
        reutilizado: participant.existingUserId !== null,
      })),
    };
  }

  async findTracking(): Promise<TrackedEnrollment | null> {
    return this.options.tracked === undefined ? TRACKED : this.options.tracked;
  }

  async findReceiptTarget(): Promise<{ id: number; estadoVerificacionPago: string } | null> {
    return this.options.receiptTarget === undefined
      ? { id: 100, estadoVerificacionPago: 'PENDIENTE' }
      : this.options.receiptTarget;
  }

  async replaceReceipt(companyEventId: number, urlComprobante: string): Promise<void> {
    this.replacedReceipts.push({ companyEventId, urlComprobante });
  }
}

export class FakeRegistrationNotifier implements RegistrationNotifierPort {
  readonly sent: SubmissionReceiptEmail[] = [];

  async sendSubmissionReceipt(email: SubmissionReceiptEmail): Promise<void> {
    this.sent.push(email);
  }
}

export class FixedTemporaryPassword {
  generate() {
    return 'Temp123456';
  }

  generatePolicyCompliant() {
    return 'Rn!abcdefghi9aA';
  }
}
