import { Inject, Injectable } from '@nestjs/common';
import {
  EVENT_REPOSITORY,
  type EventRepositoryPort,
} from '../../domain/ports/event.repository.port.js';

export interface EventBranding {
  nombre: string | null;
  urlLogoEvento: string | null;
}

/**
 * Minimal branding of the running event. Every page requests it for the title
 * and the favicon, so it stays a separate, cheap read.
 */
@Injectable()
export class GetCurrentEventBrandingUseCase {
  constructor(@Inject(EVENT_REPOSITORY) private readonly events: EventRepositoryPort) {}

  async execute(): Promise<EventBranding> {
    const event = await this.events.findPrincipal();
    return {
      nombre: event?.nombre ?? null,
      urlLogoEvento: event?.urlLogoEvento ?? null,
    };
  }
}
