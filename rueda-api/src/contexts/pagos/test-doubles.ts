import type {
  CompanyNotification,
  CompanyNotifierPort,
} from '../../shared/application/ports/company-notifier.port.js';
import type { CapacitySource } from '../participantes/domain/services/participant-capacity.js';
import type {
  ApprovalEmail,
  PaymentNotifierPort,
} from './application/ports/payment-notifier.port.js';
import type {
  ApprovedEnrollment,
  EnrollmentContact,
  MemberToCredential,
  PaginatedPayments,
  PaymentListFilters,
  PaymentsRepositoryPort,
  TopUpQuote,
  TopUpRequest,
  TopUpUnderReview,
} from './domain/ports/payments.repository.port.js';

export function buildMember(overrides: Partial<MemberToCredential> = {}): MemberToCredential {
  return {
    companyUserId: 10,
    userId: 1,
    nombres: 'Ana',
    apellidoPaterno: 'Perez',
    correo: 'ana@test.com',
    esResponsable: true,
    reusedAccount: false,
    ...overrides,
  };
}

export function buildApproved(overrides: Partial<ApprovedEnrollment> = {}): ApprovedEnrollment {
  return {
    companyEventId: 100,
    companyId: 5,
    companyName: 'Beni Agro',
    companyCode: null,
    eventName: 'Rueda de Negocios',
    members: [buildMember()],
    ...overrides,
  };
}

export const CONTACT: EnrollmentContact = {
  companyEventId: 100,
  companyName: 'Beni Agro',
  eventName: 'Rueda de Negocios',
  nombres: 'Ana',
  apellidoPaterno: 'Perez',
  correo: 'ana@test.com',
};

export function buildCapacity(overrides: Partial<CapacitySource> = {}): CapacitySource {
  return {
    paidSlots: 2,
    usedSlots: 2,
    packageName: 'Paquete Oro',
    packageMaxParticipants: 6,
    packageIncludedCredentials: 4,
    eventMaxPerCompany: 5,
    ...overrides,
  };
}

export class FakePaymentsRepository implements PaymentsRepositoryPort {
  listCalls: PaymentListFilters[] = [];
  observed: { companyEventId: number; observacion: string }[] = [];
  rejected: { companyEventId: number; motivo: string }[] = [];
  passwords: { userId: number; hashedPassword: string }[] = [];
  createdTopUps: unknown[] = [];
  approvedTopUps: { topUpId: number; companyEventId: number; newTotal: number }[] = [];
  topUpStatuses: { topUpId: number; estado: string; observacion: string | null }[] = [];

  constructor(
    private readonly options: {
      page?: PaginatedPayments;
      enrollment?: unknown;
      approved?: ApprovedEnrollment;
      contact?: EnrollmentContact | null;
      quote?: TopUpQuote | null;
      capacity?: CapacitySource | null;
      responsible?: boolean;
      ownTopUps?: TopUpRequest[];
      underReview?: TopUpUnderReview[];
      pendingTopUp?: { id: number; companyEventId: number; extraSlots: number } | null;
      topUp?: { id: number; companyEventId: number } | null;
    } = {},
  ) {}

  async list(filters: PaymentListFilters): Promise<PaginatedPayments> {
    this.listCalls.push(filters);
    return this.options.page ?? { data: [], total: 0, page: filters.page, limit: filters.limit };
  }

  async findEnrollment(): Promise<unknown> {
    return this.options.enrollment ?? null;
  }

  async approveEnrollment(): Promise<ApprovedEnrollment> {
    return this.options.approved ?? buildApproved();
  }

  async observeEnrollment(companyEventId: number, observacion: string) {
    this.observed.push({ companyEventId, observacion });
    return this.options.contact === undefined ? CONTACT : this.options.contact;
  }

  async rejectEnrollment(companyEventId: number, motivo: string) {
    this.rejected.push({ companyEventId, motivo });
    return this.options.contact === undefined ? CONTACT : this.options.contact;
  }

  async ensureCompanyCode(): Promise<string> {
    return 'RB-BEN-0005';
  }

  async setPassword(userId: number, hashedPassword: string): Promise<void> {
    this.passwords.push({ userId, hashedPassword });
  }

  async quoteTopUp(): Promise<TopUpQuote | null> {
    return this.options.quote === undefined
      ? { cantidad: 2, total: 4, urlQR: '/uploads/qr.png', monto: 200 }
      : this.options.quote;
  }

  async findCapacity(): Promise<CapacitySource | null> {
    return this.options.capacity === undefined ? buildCapacity() : this.options.capacity;
  }

  async isResponsible(): Promise<boolean> {
    return this.options.responsible ?? true;
  }

  async createTopUp(input: { amount: number }) {
    this.createdTopUps.push(input);
    return { id: 77, montoPago: input.amount };
  }

  async listTopUpsOf(): Promise<TopUpRequest[]> {
    return this.options.ownTopUps ?? [];
  }

  async listTopUpsUnderReview(): Promise<TopUpUnderReview[]> {
    return this.options.underReview ?? [];
  }

  async findPendingTopUp() {
    return this.options.pendingTopUp === undefined
      ? { id: 77, companyEventId: 100, extraSlots: 2 }
      : this.options.pendingTopUp;
  }

  async approveTopUp(topUpId: number, companyEventId: number, newTotal: number): Promise<void> {
    this.approvedTopUps.push({ topUpId, companyEventId, newTotal });
  }

  async findTopUp() {
    return this.options.topUp === undefined ? { id: 77, companyEventId: 100 } : this.options.topUp;
  }

  async setTopUpStatus(topUpId: number, estado: string, observacion: string | null): Promise<void> {
    this.topUpStatuses.push({ topUpId, estado, observacion });
  }
}

export class FakePaymentNotifier implements PaymentNotifierPort {
  readonly approvals: ApprovalEmail[] = [];
  readonly observations: { correo: string; observacion: string }[] = [];
  readonly rejections: { correo: string; motivo: string }[] = [];
  delivers = true;

  async sendApproval(email: ApprovalEmail): Promise<boolean> {
    this.approvals.push(email);
    return this.delivers;
  }

  async sendObservation(contact: EnrollmentContact, observacion: string): Promise<void> {
    this.observations.push({ correo: contact.correo, observacion });
  }

  async sendRejection(contact: EnrollmentContact, motivo: string): Promise<void> {
    this.rejections.push({ correo: contact.correo, motivo });
  }
}

export class FakeCompanyNotifier implements CompanyNotifierPort {
  readonly sent: CompanyNotification[] = [];

  async notify(notification: CompanyNotification): Promise<void> {
    this.sent.push(notification);
  }

  async notifyOnce(notification: CompanyNotification): Promise<void> {
    this.sent.push(notification);
  }
}
