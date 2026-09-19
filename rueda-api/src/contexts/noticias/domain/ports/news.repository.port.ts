import type { NewsDraft } from '../services/news-draft.js';

export interface NewsRecord {
  id: number;
  tituloNoticia: string;
  contenidoNoticia: string;
  urlImagenNoticia: string | null;
  tipoNoticia: string;
  estadoPublicacion: string;
  fechaHoraPublicacion: Date;
  fechaCreacion: Date;
  autor: { id: number; nombres: string; apellidoPaterno: string } | null;
}

export interface NewsRepositoryPort {
  findPrincipalEventId(): Promise<number | null>;
  findEventId(eventId: number): Promise<number | null>;

  /** What the event reads: published pieces, newest publication first. */
  listPublished(eventId: number): Promise<NewsRecord[]>;
  /** What the editor screen reads: every piece, drafts included. */
  listAll(eventId: number): Promise<NewsRecord[]>;
  find(newsId: number, eventId: number): Promise<NewsRecord | null>;

  create(eventId: number, authorId: number, draft: NewsDraft, publishedAt: Date): Promise<NewsRecord>;
  /**
   * @param publishedAt set only when this save is what publishes the piece, so
   * the date people read is the day it actually reached them.
   */
  update(newsId: number, draft: NewsDraft, publishedAt: Date | null): Promise<NewsRecord>;
  deactivate(newsId: number): Promise<void>;
}

export const NEWS_REPOSITORY = Symbol('NewsRepositoryPort');
