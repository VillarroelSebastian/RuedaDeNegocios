import { ValidationError } from '../../../../shared/domain/errors/domain.error.js';

/** The badges the web and the mobile app know how to render. */
export const NEWS_TYPES = ['COMUNICADO', 'NOTICIA', 'ANUNCIO', 'ALERTA'] as const;
export const PUBLICATION_STATES = ['PUBLICADO', 'BORRADOR'] as const;

export type NewsType = (typeof NEWS_TYPES)[number];
export type PublicationState = (typeof PUBLICATION_STATES)[number];

/** Column widths of `noticia`. */
const MAX = { titulo: 105, contenido: 500, imagen: 500 } as const;

const DEFAULT_TYPE: NewsType = 'COMUNICADO';
const DEFAULT_STATE: PublicationState = 'PUBLICADO';

export interface NewsDraftInput {
  tituloNoticia?: unknown;
  contenidoNoticia?: unknown;
  urlImagenNoticia?: unknown;
  tipoNoticia?: unknown;
  estadoPublicacion?: unknown;
}

export interface NewsDraft {
  tituloNoticia: string;
  contenidoNoticia: string;
  urlImagenNoticia: string | null;
  tipoNoticia: NewsType;
  estadoPublicacion: PublicationState;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

export function sanitizeNewsDraft(input: NewsDraftInput): NewsDraft {
  const tituloNoticia = text(input.tituloNoticia).slice(0, MAX.titulo);
  const contenidoNoticia = text(input.contenidoNoticia).slice(0, MAX.contenido);
  if (!tituloNoticia || !contenidoNoticia) {
    throw new ValidationError('El título y el contenido del comunicado son obligatorios.');
  }

  const tipoNoticia = (text(input.tipoNoticia).toUpperCase() || DEFAULT_TYPE) as NewsType;
  if (!NEWS_TYPES.includes(tipoNoticia)) {
    throw new ValidationError('El tipo debe ser COMUNICADO, NOTICIA, ANUNCIO o ALERTA.');
  }

  const estadoPublicacion = (text(input.estadoPublicacion).toUpperCase() ||
    DEFAULT_STATE) as PublicationState;
  if (!PUBLICATION_STATES.includes(estadoPublicacion)) {
    throw new ValidationError('El estado de publicación debe ser PUBLICADO o BORRADOR.');
  }

  const urlImagenNoticia = text(input.urlImagenNoticia).slice(0, MAX.imagen);

  return {
    tituloNoticia,
    contenidoNoticia,
    urlImagenNoticia: urlImagenNoticia.length > 0 ? urlImagenNoticia : null,
    tipoNoticia,
    estadoPublicacion,
  };
}

/**
 * Whether saving this draft is what puts it in front of people. It is the moment
 * the piece crosses into `PUBLICADO`, which is the only one worth pushing live:
 * announcing every edit of an already published piece would be noise, and a
 * draft that is never announced reaches nobody.
 *
 * @param previousState the state on file, or `null` when the piece is new.
 */
export function announcesPublication(previousState: string | null, draft: NewsDraft): boolean {
  return draft.estadoPublicacion === 'PUBLICADO' && previousState !== 'PUBLICADO';
}
