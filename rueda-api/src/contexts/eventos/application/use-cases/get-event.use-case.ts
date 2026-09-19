import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../shared/domain/errors/domain.error.js';
import {
  EVENT_REPOSITORY,
  type EventRecord,
  type EventRepositoryPort,
} from '../../domain/ports/event.repository.port.js';

@Injectable()
export class GetEventUseCase {
  constructor(@Inject(EVENT_REPOSITORY) private readonly events: EventRepositoryPort) {}

  async execute(id: number): Promise<EventRecord> {
    const event = await this.events.findById(id, { withQrRules: true });
    // The legacy endpoint answered `{}` here, which clients could not tell
    // apart from a real event.
    if (!event) throw new NotFoundError('El evento no existe.');
    return event;
  }
}
