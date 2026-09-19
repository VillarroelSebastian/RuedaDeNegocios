import type { RealtimePublisherPort } from '../../shared/application/ports/realtime-publisher.port.js';
import type { NewsRecord, NewsRepositoryPort } from './domain/ports/news.repository.port.js';
import type { NewsDraft } from './domain/services/news-draft.js';

/**
 * In-memory doubles for the news context. They implement the ports literally so
 * the use-case tests exercise real behaviour without a database.
 */

export const EVENT_ID = 7;

export function buildNews(overrides: Partial<NewsRecord> = {}): NewsRecord {
  return {
    id: 1,
    tituloNoticia: 'Cambio de sala',
    contenidoNoticia: 'El panel se traslada al salón azul.',
    urlImagenNoticia: null,
    tipoNoticia: 'ANUNCIO',
    estadoPublicacion: 'PUBLICADO',
    fechaHoraPublicacion: new Date('2026-11-10T13:00:00.000Z'),
    fechaCreacion: new Date('2026-11-10T12:00:00.000Z'),
    autor: { id: 3, nombres: 'Ana', apellidoPaterno: 'Perez' },
    ...overrides,
  };
}

export function buildNewsBody(overrides: Record<string, unknown> = {}) {
  return {
    tituloNoticia: 'Cambio de sala',
    contenidoNoticia: 'El panel se traslada al salón azul.',
    tipoNoticia: 'ANUNCIO',
    estadoPublicacion: 'PUBLICADO',
    ...overrides,
  };
}

export interface FakeNewsOptions {
  eventId?: number | null;
  published?: NewsRecord[];
  all?: NewsRecord[];
  existing?: NewsRecord | null;
}

export class FakeNewsRepository implements NewsRepositoryPort {
  readonly created: { eventId: number; authorId: number; draft: NewsDraft; publishedAt: Date }[] =
    [];
  readonly updated: { newsId: number; draft: NewsDraft; publishedAt: Date | null }[] = [];
  readonly deactivated: number[] = [];

  constructor(private readonly options: FakeNewsOptions = {}) {}

  async findPrincipalEventId(): Promise<number | null> {
    return this.options.eventId === undefined ? EVENT_ID : this.options.eventId;
  }

  async findEventId(): Promise<number | null> {
    return this.options.eventId === undefined ? EVENT_ID : this.options.eventId;
  }

  async listPublished(): Promise<NewsRecord[]> {
    return this.options.published ?? [buildNews()];
  }

  async listAll(): Promise<NewsRecord[]> {
    return this.options.all ?? [buildNews(), buildNews({ id: 2, estadoPublicacion: 'BORRADOR' })];
  }

  async find(): Promise<NewsRecord | null> {
    return this.options.existing === undefined ? buildNews() : this.options.existing;
  }

  async create(
    eventId: number,
    authorId: number,
    draft: NewsDraft,
    publishedAt: Date,
  ): Promise<NewsRecord> {
    this.created.push({ eventId, authorId, draft, publishedAt });
    return buildNews({ id: 99, ...draft });
  }

  async update(newsId: number, draft: NewsDraft, publishedAt: Date | null): Promise<NewsRecord> {
    this.updated.push({ newsId, draft, publishedAt });
    return buildNews({ id: newsId, ...draft });
  }

  async deactivate(newsId: number): Promise<void> {
    this.deactivated.push(newsId);
  }
}

export class FakeRealtimePublisher implements RealtimePublisherPort {
  readonly broadcasts: { event: string; payload: object }[] = [];
  readonly toStaffEvents: { event: string; payload: object }[] = [];
  readonly toCompanyEvents: { companyEventId: number; event: string; payload: object }[] = [];

  toCompanyEvent(companyEventId: number, event: string, payload: object): void {
    this.toCompanyEvents.push({ companyEventId, event, payload });
  }

  toStaff(event: string, payload: object): void {
    this.toStaffEvents.push({ event, payload });
  }

  broadcast(event: string, payload: object): void {
    this.broadcasts.push({ event, payload });
  }
}
