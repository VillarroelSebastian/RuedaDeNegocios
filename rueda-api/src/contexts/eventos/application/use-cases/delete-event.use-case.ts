import { Inject, Injectable } from '@nestjs/common';
import { ConflictError, NotFoundError } from '../../../../shared/domain/errors/domain.error.js';
import {
  EVENT_REPOSITORY,
  type EventRepositoryPort,
} from '../../domain/ports/event.repository.port.js';

@Injectable()
export class DeleteEventUseCase {
  constructor(@Inject(EVENT_REPOSITORY) private readonly events: EventRepositoryPort) {}

  async execute(id: number): Promise<void> {
    const event = await this.events.findById(id);
    if (!event) throw new NotFoundError('El evento no existe.');

    if (event.esPrincipal === 1) {
      throw new ConflictError(
        'No puedes eliminar el evento principal. Haz otro evento principal primero.',
      );
    }

    // Logical removal: the history of past editions has to stay queryable.
    await this.events.deactivate(id);
  }
}
