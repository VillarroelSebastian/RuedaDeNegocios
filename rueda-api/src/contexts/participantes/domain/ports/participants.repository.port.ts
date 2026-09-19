import type { CapacitySource } from '../services/participant-capacity.js';

export interface RosterParticipant {
  id: number;
  esResponsable: boolean;
  cargo: string | null;
  estaActivo: number;
  usuario: {
    id: number;
    nombres: string;
    apellidoPaterno: string;
    apellidoMaterno: string | null;
    correo: string;
    telefono: string;
  };
}

export interface RosterPayment {
  id: number;
  tipoPago: string;
  cantidadParticipantes: number | null;
  montoPago: number | null;
  estadoPago: string;
  observacion: string | null;
  urlComprobante: string | null;
  fechaCreacion: Date;
}

export interface ParticipantRoster {
  capacity: CapacitySource;
  participantes: RosterParticipant[];
  pagos: RosterPayment[];
}

/** An enrollment cleared to register people, with what bounds its capacity. */
export interface GrantedEnrollment {
  id: number;
  companyId: number;
  eventId: number;
  capacity: CapacitySource;
}

export interface ExistingAccount {
  id: number;
  rolEvento: string;
  /** Whether the account is already enrolled in this event. */
  enrolledInEvent: boolean;
}

export interface AddParticipantData {
  companyEventId: number;
  companyId: number;
  existingUserId: number | null;
  nombres: string;
  apellidoPaterno: string;
  email: string;
  telefono: string;
  cargo: string;
  hashedPassword: string | null;
  urlFotoPerfil: string;
}

export interface AddedParticipant {
  companyUserId: number;
  userId: number;
  nombreCompleto: string;
}

export interface ParticipantsRepositoryPort {
  findRoster(companyEventId: number): Promise<ParticipantRoster | null>;
  /** The caller's own membership, only when it is the one in charge. */
  findResponsibleMembership(companyEventId: number, userId: number): Promise<{ id: number } | null>;
  findGrantedEnrollment(companyEventId: number): Promise<GrantedEnrollment | null>;

  findAccountByEmail(email: string, eventId: number): Promise<ExistingAccount | null>;
  isPhoneTakenInEvent(eventId: number, phone: string, exceptUserId: number | null): Promise<boolean>;

  /**
   * Adds the participant, re-checking capacity inside the transaction so two
   * concurrent requests cannot both take the last slot.
   */
  addParticipant(data: AddParticipantData): Promise<AddedParticipant>;

  findRemovableParticipant(
    companyEventId: number,
    companyUserId: number,
  ): Promise<{ id: number; userId: number } | null>;
  /** Deactivates the membership, and the account only if nothing else links it. */
  deactivateParticipant(companyUserId: number, userId: number): Promise<void>;

  findActiveParticipantAccount(userId: number): Promise<{ id: number; correo: string } | null>;
  setPassword(userId: number, hashedPassword: string): Promise<void>;
}

export const PARTICIPANTS_REPOSITORY = Symbol('ParticipantsRepositoryPort');
