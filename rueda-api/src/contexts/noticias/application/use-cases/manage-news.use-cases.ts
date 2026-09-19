import { Inject, Injectable } from '@nestjs/common';
import { CLOCK_PORT, type ClockPort } from '../../../../shared/application/ports/clock.port.js';
import {
  REALTIME_PUBLISHER_PORT,
  type RealtimePublisherPort,
} from '../../../../shared/application/ports/realtime-publisher.port.js';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/domain.error.js';
import {
  NEWS_REPOSITORY,
  type NewsRecord,
  type NewsRepositoryPort,
} from '../../domain/ports/news.repository.port.js';
import {
  announcesPublication,
  type NewsDraft,
  type NewsDraftInput,
  sanitizeNewsDraft,
} from '../../domain/services/news-draft.js';

const NO_EVENT = 'No hay evento principal configurado';
const NOT_IN_EVENT = 'Comunicado no encontrado en el evento activo';
const LIVE_EVENT = 'comunicado:nuevo';

/** Every write targets the event that is running; there is no other board. */
async function currentEvent(news: NewsRepositoryPort): Promise<number> {
  const eventId = await news.findPrincipalEventId();
  if (!eventId) throw new ValidationError(NO_EVENT);
  return eventId;
}

function pushLive(realtime: RealtimePublisherPort, draft: NewsDraft): void {
  realtime.broadcast(LIVE_EVENT, {
    titulo: draft.tituloNoticia,
    mensaje: `Nuevo comunicado: ${draft.tituloNoticia}`,
  });
}

@Injectable()
export class PublishNewsUseCase {
  constructor(
    @Inject(NEWS_REPOSITORY) private readonly news: NewsRepositoryPort,
    @Inject(REALTIME_PUBLISHER_PORT) private readonly realtime: RealtimePublisherPort,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
  ) {}

  /** @param authorId the caller, taken from the token. */
  async execute(authorId: number, input: NewsDraftInput): Promise<NewsRecord> {
    const eventId = await currentEvent(this.news);
    const draft = sanitizeNewsDraft(input);

    const created = await this.news.create(eventId, authorId, draft, this.clock.now());

    if (announcesPublication(null, draft)) pushLive(this.realtime, draft);

    return created;
  }
}

@Injectable()
export class UpdateNewsUseCase {
  constructor(
    @Inject(NEWS_REPOSITORY) private readonly news: NewsRepositoryPort,
    @Inject(REALTIME_PUBLISHER_PORT) private readonly realtime: RealtimePublisherPort,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
  ) {}

  async execute(newsId: number, input: NewsDraftInput): Promise<NewsRecord> {
    const eventId = await currentEvent(this.news);

    const existing = await this.news.find(newsId, eventId);
    if (!existing) throw new NotFoundError(NOT_IN_EVENT);

    const draft = sanitizeNewsDraft(input);
    // A draft being published now carries today's date, not the day it was
    // drafted: that date is what the list is sorted and read by.
    const publishing = announcesPublication(existing.estadoPublicacion, draft);

    const updated = await this.news.update(newsId, draft, publishing ? this.clock.now() : null);

    if (publishing) pushLive(this.realtime, draft);

    return updated;
  }
}

/** Retires the piece. History keeps it; the board stops showing it. */
@Injectable()
export class DeleteNewsUseCase {
  constructor(@Inject(NEWS_REPOSITORY) private readonly news: NewsRepositoryPort) {}

  async execute(newsId: number): Promise<void> {
    const eventId = await currentEvent(this.news);

    const existing = await this.news.find(newsId, eventId);
    if (!existing) throw new NotFoundError(NOT_IN_EVENT);

    await this.news.deactivate(newsId);
  }
}
