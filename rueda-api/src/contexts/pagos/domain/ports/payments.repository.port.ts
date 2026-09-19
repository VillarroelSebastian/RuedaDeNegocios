import type { Paginated } from '../../../../shared/domain/pagination.js';
import type { CapacitySource } from '../../../participantes/domain/services/participant-capacity.js';

export interface PaymentListFilters {
  estado?: string;
  page: number;
  limit: number;
}

export type { Paginated };

/** A member who must receive access credentials once the payment is approved. */
export interface MemberToCredential {
  companyUserId: number;
  userId: number;
  nombres: string;
  apellidoPaterno: string;
  correo: string;
  esResponsable: boolean;
  /** True when the account already belongs to another enrollment. */
  reusedAccount: boolean;
}

export interface ApprovedEnrollment {
  companyEventId: number;
  companyId: number;
  companyName: string;
  companyCode: string | null;
  eventName: string | null;
  members: MemberToCredential[];
}

/** The person to write to when a payment is observed or rejected. */
export interface EnrollmentContact {
  companyEventId: number;
  companyName: string;
  eventName: string | null;
  nombres: string;
  apellidoPaterno: string;
  correo: string;
}

export interface TopUpRequest {
  id: number;
  tipoPago: string;
  cantidadParticipantes: number | null;
  montoPago: number | null;
  estadoPago: string;
  observacion: string | null;
  urlComprobante: string | null;
  fechaCreacion: Date;
}

export interface TopUpUnderReview extends TopUpRequest {
  companyEventId: number;
  empresa: Record<string, unknown> | null;
}

export interface TopUpQuote {
  cantidad: number;
  /** Slots the company would end up with. */
  total: number;
  urlQR: string | null;
  monto: number;
}

export type PaginatedPayments = Paginated<unknown>;

export interface PaymentsRepositoryPort {
  list(filters: PaymentListFilters): Promise<PaginatedPayments>;
  findEnrollment(companyEventId: number): Promise<unknown>;

  /**
   * Moves the enrollment to approved in one atomic step, refusing a second
   * concurrent approval. Returns the members who need credentials.
   */
  approveEnrollment(companyEventId: number): Promise<ApprovedEnrollment>;
  observeEnrollment(companyEventId: number, observacion: string): Promise<EnrollmentContact | null>;
  rejectEnrollment(companyEventId: number, motivo: string): Promise<EnrollmentContact | null>;

  /** Assigns a readable code if the company has none, and returns it. */
  ensureCompanyCode(companyId: number, currentCode: string | null): Promise<string>;
  setPassword(userId: number, hashedPassword: string): Promise<void>;

  quoteTopUp(companyEventId: number, extraSlots: number): Promise<TopUpQuote | null>;
  findCapacity(companyEventId: number): Promise<CapacitySource | null>;
  isResponsible(companyEventId: number, userId: number): Promise<boolean>;
  createTopUp(input: {
    companyEventId: number;
    extraSlots: number;
    amount: number;
    receiptUrl: string;
  }): Promise<{ id: number; montoPago: number }>;

  listTopUpsOf(companyEventId: number): Promise<TopUpRequest[]>;
  listTopUpsUnderReview(estado?: string): Promise<TopUpUnderReview[]>;
  findPendingTopUp(
    topUpId: number,
  ): Promise<{ id: number; companyEventId: number; extraSlots: number } | null>;
  /** Approves the top-up and raises the paid slots, atomically. */
  approveTopUp(topUpId: number, companyEventId: number, newTotal: number): Promise<void>;
  findTopUp(topUpId: number): Promise<{ id: number; companyEventId: number } | null>;
  setTopUpStatus(topUpId: number, estado: string, observacion: string | null): Promise<void>;
}

export const PAYMENTS_REPOSITORY = Symbol('PaymentsRepositoryPort');
