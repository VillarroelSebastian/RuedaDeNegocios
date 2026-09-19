import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../../../shared/domain/errors/domain.error.js';
import { announcesPublication, sanitizeNewsDraft } from './news-draft.js';

const DRAFT = {
  tituloNoticia: '  Cambio  de  sala ',
  contenidoNoticia: ' El panel se traslada al salón azul. ',
  tipoNoticia: 'ANUNCIO',
  estadoPublicacion: 'PUBLICADO',
};

describe('sanitizeNewsDraft', () => {
  it('collapses the whitespace of the text it stores', () => {
    const draft = sanitizeNewsDraft(DRAFT);

    expect(draft.tituloNoticia).toBe('Cambio de sala');
    expect(draft.contenidoNoticia).toBe('El panel se traslada al salón azul.');
  });

  it('refuses a piece without a title or without a body', () => {
    expect(() => sanitizeNewsDraft({ ...DRAFT, tituloNoticia: '  ' })).toThrow(
      'El título y el contenido del comunicado son obligatorios.',
    );
    expect(() => sanitizeNewsDraft({ ...DRAFT, contenidoNoticia: '' })).toThrow(ValidationError);
  });

  it('caps the text at the width of its column', () => {
    const draft = sanitizeNewsDraft({
      ...DRAFT,
      tituloNoticia: 'T'.repeat(200),
      contenidoNoticia: 'C'.repeat(900),
    });

    expect(draft.tituloNoticia).toHaveLength(105);
    expect(draft.contenidoNoticia).toHaveLength(500);
  });

  it('defaults to a published announcement', () => {
    const draft = sanitizeNewsDraft({
      tituloNoticia: 'Hola',
      contenidoNoticia: 'Buenos días',
    });

    expect(draft.tipoNoticia).toBe('COMUNICADO');
    expect(draft.estadoPublicacion).toBe('PUBLICADO');
  });

  it('accepts the type however it was typed', () => {
    expect(sanitizeNewsDraft({ ...DRAFT, tipoNoticia: 'alerta' }).tipoNoticia).toBe('ALERTA');
  });

  it('refuses a type the clients do not render', () => {
    expect(() => sanitizeNewsDraft({ ...DRAFT, tipoNoticia: 'EDITORIAL' })).toThrow(
      'El tipo debe ser COMUNICADO, NOTICIA, ANUNCIO o ALERTA.',
    );
  });

  it('refuses a publication state that is not one', () => {
    expect(() => sanitizeNewsDraft({ ...DRAFT, estadoPublicacion: 'ARCHIVADO' })).toThrow(
      'El estado de publicación debe ser PUBLICADO o BORRADOR.',
    );
  });

  it('turns a blank image into nothing stored', () => {
    expect(sanitizeNewsDraft({ ...DRAFT, urlImagenNoticia: '   ' }).urlImagenNoticia).toBeNull();
    expect(sanitizeNewsDraft({ ...DRAFT, urlImagenNoticia: '/uploads/a.png' }).urlImagenNoticia).toBe(
      '/uploads/a.png',
    );
  });
});

describe('announcesPublication', () => {
  const published = sanitizeNewsDraft(DRAFT);
  const unpublished = sanitizeNewsDraft({ ...DRAFT, estadoPublicacion: 'BORRADOR' });

  it('announces a piece that is born published', () => {
    expect(announcesPublication(null, published)).toBe(true);
  });

  it('stays quiet about a piece that is born a draft', () => {
    expect(announcesPublication(null, unpublished)).toBe(false);
  });

  // The legacy endpoint only announced on create, so a draft published days
  // later reached nobody.
  it('announces a draft that is being published now', () => {
    expect(announcesPublication('BORRADOR', published)).toBe(true);
  });

  it('stays quiet when an already published piece is edited', () => {
    expect(announcesPublication('PUBLICADO', published)).toBe(false);
  });

  it('stays quiet when a published piece is pulled back to a draft', () => {
    expect(announcesPublication('PUBLICADO', unpublished)).toBe(false);
  });
});
