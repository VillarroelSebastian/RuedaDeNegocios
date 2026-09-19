import { describe, expect, it } from 'vitest';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../../shared/domain/errors/domain.error.js';
import { ROLES } from '../../../../shared/domain/role.js';
import {
  ENV,
  FakeFileStorage,
  FakeGalleryRepository,
  type FakeGalleryOptions,
  MEMBERSHIP_ID,
  OWN_URL,
  PHOTO_ID,
  STAFF_USER_ID,
} from '../../test-doubles.js';
import {
  AddPhotoUseCase,
  ListPhotosUseCase,
  RemovePhotoUseCase,
} from './gallery.use-cases.js';
import { StoreUploadUseCase } from './store-upload.use-case.js';

const PNG = (() => {
  const buffer = Buffer.alloc(32);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(buffer);
  buffer.writeUInt32BE(800, 16);
  buffer.writeUInt32BE(600, 20);
  return buffer;
})();

function build(options: FakeGalleryOptions = {}) {
  const repository = new FakeGalleryRepository(options);
  const storage = new FakeFileStorage();

  return {
    repository,
    storage,
    list: new ListPhotosUseCase(repository),
    add: new AddPhotoUseCase(repository, ENV),
    remove: new RemovePhotoUseCase(repository),
    upload: new StoreUploadUseCase(storage, ENV),
  };
}

describe('StoreUploadUseCase', () => {
  const file = { mimetype: 'image/png', size: 1024, buffer: PNG };

  it('stores the file and hands back the URL it is served at', async () => {
    const { upload, storage } = build();

    const stored = await upload.execute(file);

    expect(stored.url).toMatch(/^https:\/\/api\.test\/uploads\/\d+-[a-f0-9]{16}\.png$/);
    expect(storage.saved[0]?.mimeType).toBe('image/png');
  });

  /** A name chosen by the caller is a name chosen by an attacker. */
  it('names the file itself, keeping nothing of what was uploaded', async () => {
    const { upload, storage } = build();

    await upload.execute(file);

    expect(storage.saved[0]?.filename).not.toContain('foto');
  });

  it('refuses a request with no file', async () => {
    const { upload } = build();

    await expect(upload.execute(undefined)).rejects.toThrow(
      'No se proporcionó ningún archivo',
    );
  });

  it('refuses a format that is not allowed', async () => {
    const { upload } = build();

    await expect(
      upload.execute({ mimetype: 'image/gif', size: 1024, buffer: PNG }),
    ).rejects.toThrow(ValidationError);
  });
});

describe('ListPhotosUseCase', () => {
  it('shows the pictures of the running event', async () => {
    const { list } = build();

    expect(await list.execute()).toHaveLength(1);
  });

  it('asks for a sane page even when the caller asks for none', async () => {
    const { list, repository } = build();

    await list.execute();

    expect(repository.listCalls[0]).toEqual({ limit: 60, soloTecnicos: false });
  });

  it('never hands out more than the page limit', async () => {
    const { list, repository } = build();

    await list.execute({ limit: 5000 });

    expect(repository.listCalls[0]?.limit).toBe(200);
  });

  it('can narrow the gallery to what the event team photographed', async () => {
    const { list, repository } = build();

    await list.execute({ soloTecnicos: true });

    expect(repository.listCalls[0]?.soloTecnicos).toBe(true);
  });

  it('answers with nothing while no event is running', async () => {
    const { list } = build({ eventId: null });

    expect(await list.execute()).toEqual([]);
  });
});

describe('AddPhotoUseCase', () => {
  const byParticipant = {
    companyUserId: MEMBERSHIP_ID,
    userId: null,
    urlFoto: OWN_URL,
  };

  it('signs the picture with the participant who uploaded it', async () => {
    const { add, repository } = build();

    const photo = await add.execute({ ...byParticipant, descripcion: '  La mesa 3  ' });

    expect(repository.added[0]?.author).toEqual({
      companyUserId: MEMBERSHIP_ID,
      userId: null,
      nombre: 'Ana Perez',
    });
    expect(repository.added[0]?.photo.descripcion).toBe('La mesa 3');
    expect(photo.autorNombre).toBe('Ana Perez');
  });

  it('signs the picture with the member of the team who uploaded it', async () => {
    const { add, repository } = build();

    await add.execute({ companyUserId: null, userId: STAFF_USER_ID, urlFoto: OWN_URL });

    expect(repository.added[0]?.author.nombre).toBe('Luis Gomez');
  });

  it('refuses a participant whose company is not cleared yet', async () => {
    const { add } = build({ membership: null });

    await expect(add.execute(byParticipant)).rejects.toThrow(
      'Tu empresa aún no está habilitada para subir fotos.',
    );
  });

  it('refuses an upload nobody is behind', async () => {
    const { add } = build();

    await expect(
      add.execute({ companyUserId: null, userId: null, urlFoto: OWN_URL }),
    ).rejects.toThrow('No se pudo identificar quién sube la foto.');
  });

  /**
   * A URL pointing anywhere else would turn the gallery into a way of hanging
   * somebody else's content under the event's name.
   */
  it('refuses a picture served by somebody else', async () => {
    const { add } = build();

    await expect(
      add.execute({ ...byParticipant, urlFoto: 'https://evil.test/uploads/foto.png' }),
    ).rejects.toThrow('La fotografía debe subirse desde el dispositivo.');
  });

  it('accepts a picture served by an allowed host', async () => {
    const { add, repository } = build();

    await add.execute({ ...byParticipant, urlFoto: 'https://cdn.test/uploads/foto.png' });

    expect(repository.added).toHaveLength(1);
  });

  it('refuses a picture whose file is not really there', async () => {
    const { add } = build({ uploadExists: false });

    await expect(add.execute(byParticipant)).rejects.toThrow(ValidationError);
  });

  it('refuses while no event is running', async () => {
    const { add } = build({ eventId: null });

    await expect(add.execute(byParticipant)).rejects.toThrow(
      'No hay un evento principal activo.',
    );
  });
});

describe('RemovePhotoUseCase', () => {
  it('lets the author take down their own picture', async () => {
    const { remove, repository } = build();

    await remove.execute({
      photoId: PHOTO_ID,
      companyUserId: MEMBERSHIP_ID,
      role: ROLES.EMPRESA,
    });

    expect(repository.deactivated).toEqual([PHOTO_ID]);
  });

  it('refuses a participant taking down somebody else picture', async () => {
    const { remove } = build();

    await expect(
      remove.execute({ photoId: PHOTO_ID, companyUserId: 999, role: ROLES.EMPRESA }),
    ).rejects.toThrow('Solo puedes eliminar las fotos que tú subiste.');
  });

  /** The team moderates, so it takes down any picture. */
  it.each([ROLES.ADMIN, ROLES.TECNICO, ROLES.TECNICO_EVENTOS])(
    'lets a %s take down any picture',
    async (role) => {
      const { remove, repository } = build();

      await remove.execute({ photoId: PHOTO_ID, companyUserId: null, role });

      expect(repository.deactivated).toEqual([PHOTO_ID]);
    },
  );

  it('refuses a picture that is no longer there', async () => {
    const { remove } = build({ photo: null });

    await expect(
      remove.execute({ photoId: 404, companyUserId: null, role: ROLES.ADMIN }),
    ).rejects.toThrow(NotFoundError);
  });

  it('raises a forbidden error, not a validation one', async () => {
    const { remove } = build();

    await expect(
      remove.execute({ photoId: PHOTO_ID, companyUserId: 999, role: ROLES.EMPRESA }),
    ).rejects.toThrow(ForbiddenError);
  });
});
