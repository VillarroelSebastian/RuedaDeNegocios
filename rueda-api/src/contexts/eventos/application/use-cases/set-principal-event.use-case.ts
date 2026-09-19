import { Inject, Injectable } from '@nestjs/common';
import { ConflictError, NotFoundError } from '../../../../shared/domain/errors/domain.error.js';
import {
  EVENT_REPOSITORY,
  type EventRecord,
  type EventRepositoryPort,
} from '../../domain/ports/event.repository.port.js';

@Injectable()
export class SetPrincipalEventUseCase {
  constructor(@Inject(EVENT_REPOSITORY) private readonly events: EventRepositoryPort) {}

  async execute(id: number): Promise<EventRecord> {
    const event = await this.events.findById(id);
    if (!event || event.estaActivo === 0) {
      throw new NotFoundError('El evento no existe o está inactivo.');
    }

    // Publishing an event with no package would let companies register without
    // anything to pay for.
    const packages = await this.events.countActivePackages(id);
    if (packages === 0) {
      throw new ConflictError(
        `Configura al menos un paquete de inscripción para "${event.nombre}" antes de activarlo como evento principal.`,
      );
    }

    return this.events.makePrincipal(id);
  }
}
