import { describe, expect, it } from 'vitest';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/domain.error.js';
import { FixedClock } from '../../../auth/test-doubles.js';
import {
  EVENT_ID,
  FakeNewsRepository,
  type FakeNewsOptions,
  FakeRealtimePublisher,
  buildNews,
  buildNewsBody,
} from '../../test-doubles.js';
import {
  DeleteNewsUseCase,
  PublishNewsUseCase,
  UpdateNewsUseCase,
} from './manage-news.use-cases.js';
import { ListAllNewsUseCase, ListPublishedNewsUseCase } from './read-news.use-cases.js';

const NOW = new Date('2026-11-12T15:00:00.000Z');
const AUTHOR_ID = 3;

function buildWriter(options: FakeNewsOptions = {}) {
  const repository = new FakeNewsRepository(options);
  const realtime = new FakeRealtimePublisher();
  const clock = new FixedClock(NOW);
  return {
    repository,
    realtime,
    publish: new PublishNewsUseCase(repository, realtime, clock),
    update: new UpdateNewsUseCase(repository, realtime, clock),
    remove: new DeleteNewsUseCase(repository),
  };
}

describe('ListPublishedNewsUseCase', () => {
  it('hands back what the event may read', async () => {
    const useCase = new ListPublishedNewsUseCase(new FakeNewsRepository());

    const news = await useCase.execute();

    expect(news).toHaveLength(1);
    expect(news[0]?.estadoPublicacion).toBe('PUBLICADO');
  });

  it('answers with nothing while no event is running', async () => {
    const useCase = new ListPublishedNewsUseCase(new FakeNewsRepository({ eventId: null }));

    expect(await useCase.execute()).toEqual([]);
  });
});

describe('ListAllNewsUseCase', () => {
  it('shows the drafts too, which is what the editor screen needs', async () => {
    const useCase = new ListAllNewsUseCase(new FakeNewsRepository());

    const news = await useCase.execute();

    expect(news.map((piece) => piece.estadoPublicacion)).toEqual(['PUBLICADO', 'BORRADOR']);
  });

  it('answers with nothing for an event that is not there', async () => {
    const useCase = new ListAllNewsUseCase(new FakeNewsRepository({ eventId: null }));

    expect(await useCase.execute(404)).toEqual([]);
  });
});

describe('PublishNewsUseCase', () => {
  it('signs the piece with the caller, never with whoever the body names', async () => {
    const { publish, repository } = buildWriter();

    await publish.execute(AUTHOR_ID, buildNewsBody());

    expect(repository.created[0]?.authorId).toBe(AUTHOR_ID);
    expect(repository.created[0]?.eventId).toBe(EVENT_ID);
  });

  it('stamps the moment it reached people', async () => {
    const { publish, repository } = buildWriter();

    await publish.execute(AUTHOR_ID, buildNewsBody());

    expect(repository.created[0]?.publishedAt).toEqual(NOW);
  });

  it('pushes a published piece live', async () => {
    const { publish, realtime } = buildWriter();

    await publish.execute(AUTHOR_ID, buildNewsBody({ tituloNoticia: 'Cambio de sala' }));

    expect(realtime.broadcasts).toEqual([
      {
        event: 'comunicado:nuevo',
        payload: { titulo: 'Cambio de sala', mensaje: 'Nuevo comunicado: Cambio de sala' },
      },
    ]);
  });

  it('keeps a draft to itself', async () => {
    const { publish, realtime } = buildWriter();

    await publish.execute(AUTHOR_ID, buildNewsBody({ estadoPublicacion: 'BORRADOR' }));

    expect(realtime.broadcasts).toEqual([]);
  });

  it('refuses a piece without a title', async () => {
    const { publish } = buildWriter();

    await expect(publish.execute(AUTHOR_ID, buildNewsBody({ tituloNoticia: '' }))).rejects.toThrow(
      ValidationError,
    );
  });

  it('refuses while no event is configured', async () => {
    const { publish } = buildWriter({ eventId: null });

    await expect(publish.execute(AUTHOR_ID, buildNewsBody())).rejects.toThrow(
      'No hay evento principal configurado',
    );
  });
});

describe('UpdateNewsUseCase', () => {
  it('rewrites a piece of the current event', async () => {
    const { update, repository } = buildWriter();

    await update.execute(1, buildNewsBody({ tituloNoticia: 'Sala corregida' }));

    expect(repository.updated[0]?.newsId).toBe(1);
    expect(repository.updated[0]?.draft.tituloNoticia).toBe('Sala corregida');
  });

  // The legacy endpoint updated by id alone, so a piece of another event could
  // be edited from the panel of the current one.
  it('refuses a piece that does not belong to the current event', async () => {
    const { update } = buildWriter({ existing: null });

    await expect(update.execute(404, buildNewsBody())).rejects.toThrow(
      'Comunicado no encontrado en el evento activo',
    );
  });

  it('stamps the publication date when a draft is being published', async () => {
    const { update, repository, realtime } = buildWriter({
      existing: buildNews({ estadoPublicacion: 'BORRADOR' }),
    });

    await update.execute(1, buildNewsBody({ estadoPublicacion: 'PUBLICADO' }));

    expect(repository.updated[0]?.publishedAt).toEqual(NOW);
    expect(realtime.broadcasts).toHaveLength(1);
  });

  it('leaves the publication date alone when the piece was already published', async () => {
    const { update, repository, realtime } = buildWriter();

    await update.execute(1, buildNewsBody({ contenidoNoticia: 'Texto corregido' }));

    expect(repository.updated[0]?.publishedAt).toBeNull();
    expect(realtime.broadcasts).toEqual([]);
  });

  it('leaves the publication date alone when a piece is pulled back to a draft', async () => {
    const { update, repository } = buildWriter();

    await update.execute(1, buildNewsBody({ estadoPublicacion: 'BORRADOR' }));

    expect(repository.updated[0]?.publishedAt).toBeNull();
  });
});

describe('DeleteNewsUseCase', () => {
  it('retires the piece instead of erasing it', async () => {
    const { remove, repository } = buildWriter();

    await remove.execute(1);

    expect(repository.deactivated).toEqual([1]);
  });

  it('refuses a piece that does not belong to the current event', async () => {
    const { remove } = buildWriter({ existing: null });

    await expect(remove.execute(404)).rejects.toThrow(NotFoundError);
  });
});
