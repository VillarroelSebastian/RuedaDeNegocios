import { Inject, Injectable } from '@nestjs/common';
import {
  NEWS_REPOSITORY,
  type NewsRecord,
  type NewsRepositoryPort,
} from '../../domain/ports/news.repository.port.js';

/** The event id the request works on, or nothing when there is none. */
async function resolveEvent(
  news: NewsRepositoryPort,
  eventId?: number,
): Promise<number | null> {
  return eventId ? news.findEventId(eventId) : news.findPrincipalEventId();
}

/**
 * What the event reads. Replaces `GET /tecnico/noticias` and
 * `GET /empresa/comunicados`, which returned the same rows under different
 * field names.
 */
@Injectable()
export class ListPublishedNewsUseCase {
  constructor(@Inject(NEWS_REPOSITORY) private readonly news: NewsRepositoryPort) {}

  async execute(eventId?: number): Promise<NewsRecord[]> {
    const event = await resolveEvent(this.news, eventId);
    return event ? this.news.listPublished(event) : [];
  }
}

/** The editorial list, drafts included. Replaces `GET /admin/noticias`. */
@Injectable()
export class ListAllNewsUseCase {
  constructor(@Inject(NEWS_REPOSITORY) private readonly news: NewsRepositoryPort) {}

  async execute(eventId?: number): Promise<NewsRecord[]> {
    const event = await resolveEvent(this.news, eventId);
    return event ? this.news.listAll(event) : [];
  }
}
