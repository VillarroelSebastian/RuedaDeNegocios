import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../shared/domain/errors/domain.error.js';
import {
  EVENT_REPOSITORY,
  type EventConfigPatch,
  type EventRepositoryPort,
} from '../../domain/ports/event.repository.port.js';
import { type EventConfigView, toConfigView } from './get-current-event-config.use-case.js';

export type UpdateEventConfigCommand = EventConfigPatch;

@Injectable()
export class UpdateCurrentEventConfigUseCase {
  constructor(@Inject(EVENT_REPOSITORY) private readonly events: EventRepositoryPort) {}

  async execute(command: UpdateEventConfigCommand): Promise<EventConfigView> {
    const event = await this.events.findPrincipal();
    if (!event) throw new NotFoundError('No hay evento principal configurado.');

    // Only the keys actually submitted are written, so a partial form never
    // resets the values it did not show.
    const patch: EventConfigPatch = {};
    for (const [key, value] of Object.entries(command)) {
      if (value !== undefined) patch[key as keyof EventConfigPatch] = Number(value);
    }

    return toConfigView(await this.events.patchConfig(event.id, patch));
  }
}
