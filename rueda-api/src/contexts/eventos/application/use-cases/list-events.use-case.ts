import { Inject, Injectable } from '@nestjs/common';
import {
  EVENT_REPOSITORY,
  type EventRecord,
  type EventRepositoryPort,
} from '../../domain/ports/event.repository.port.js';

@Injectable()
export class ListEventsUseCase {
  constructor(@Inject(EVENT_REPOSITORY) private readonly events: EventRepositoryPort) {}

  execute(): Promise<EventRecord[]> {
    return this.events.listActive();
  }
}
