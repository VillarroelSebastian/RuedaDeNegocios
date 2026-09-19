import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../shared/domain/errors/domain.error.js';
import {
  PARTICIPANTS_REPOSITORY,
  type ParticipantsRepositoryPort,
  type RosterParticipant,
  type RosterPayment,
} from '../../domain/ports/participants.repository.port.js';
import { availableSlots, maxParticipantsOf } from '../../domain/services/participant-capacity.js';

export interface RosterView {
  slotsUsados: number;
  slotsPagados: number;
  slotsDisponibles: number;
  maxPermitidos: number;
  /** Blocks asking for more slots while a top-up is still being reviewed. */
  pagoAdicionalPendiente: boolean;
  participantes: RosterParticipant[];
  pagos: RosterPayment[];
}

@Injectable()
export class GetRosterUseCase {
  constructor(
    @Inject(PARTICIPANTS_REPOSITORY) private readonly participants: ParticipantsRepositoryPort,
  ) {}

  async execute(companyEventId: number): Promise<RosterView> {
    const roster = await this.participants.findRoster(companyEventId);
    if (!roster) throw new NotFoundError('La inscripción no existe.');

    return {
      slotsUsados: roster.capacity.usedSlots,
      slotsPagados: roster.capacity.paidSlots,
      slotsDisponibles: availableSlots(roster.capacity),
      maxPermitidos: maxParticipantsOf(roster.capacity),
      pagoAdicionalPendiente: roster.pagos.some(
        (payment) => payment.tipoPago === 'ADICIONAL' && payment.estadoPago === 'PENDIENTE',
      ),
      participantes: roster.participantes,
      pagos: roster.pagos,
    };
  }
}
