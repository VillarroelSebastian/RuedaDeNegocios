import type {
  FileStoragePort,
  FileToStore,
  StoredFile,
} from '../../shared/application/ports/file-storage.port.js';
import type { Env } from '../../shared/config/env.schema.js';
import type {
  GalleryRepositoryPort,
  PhotoAuthor,
  PhotoRecord,
} from './domain/ports/gallery.repository.port.js';

/**
 * In-memory doubles for the files context. They implement the ports literally
 * so the use-case tests exercise real behaviour without a database or a disk.
 */

export const ENV = {
  PORT: 3334,
  PUBLIC_URL: 'https://api.test',
  UPLOAD_HOSTS: ['cdn.test'],
} as Env;

export const EVENT_ID = 7;
export const MEMBERSHIP_ID = 500;
export const STAFF_USER_ID = 3;
export const PHOTO_ID = 11;
export const OWN_URL = 'https://api.test/uploads/foto.png';

export function buildPhoto(overrides: Partial<PhotoRecord> = {}): PhotoRecord {
  return {
    id: PHOTO_ID,
    urlFoto: OWN_URL,
    descripcion: null,
    autorNombre: 'Ana Perez',
    fechaCreacion: new Date('2026-11-10T12:00:00.000Z'),
    ...overrides,
  };
}

export interface FakeGalleryOptions {
  eventId?: number | null;
  photos?: PhotoRecord[];
  membership?: { id: number; nombre: string } | null;
  staffAuthor?: { id: number; nombre: string } | null;
  photo?: { id: number; companyUserId: number | null } | null;
  uploadExists?: boolean;
}

export class FakeGalleryRepository implements GalleryRepositoryPort {
  readonly added: { author: PhotoAuthor; photo: Record<string, unknown> }[] = [];
  readonly deactivated: number[] = [];
  readonly listCalls: { limit: number; soloTecnicos: boolean }[] = [];

  constructor(private readonly options: FakeGalleryOptions = {}) {}

  async findPrincipalEventId(): Promise<number | null> {
    return this.options.eventId === undefined ? EVENT_ID : this.options.eventId;
  }

  async list(
    _eventId: number,
    filters: { limit: number; soloTecnicos: boolean },
  ): Promise<PhotoRecord[]> {
    this.listCalls.push(filters);
    return this.options.photos ?? [buildPhoto()];
  }

  async findGrantedMembership(): Promise<{ id: number; nombre: string } | null> {
    return this.options.membership === undefined
      ? { id: MEMBERSHIP_ID, nombre: 'Ana Perez' }
      : this.options.membership;
  }

  async findStaffAuthor(): Promise<{ id: number; nombre: string } | null> {
    return this.options.staffAuthor === undefined
      ? { id: STAFF_USER_ID, nombre: 'Luis Gomez' }
      : this.options.staffAuthor;
  }

  async add(
    _eventId: number,
    author: PhotoAuthor,
    photo: { urlFoto: string; descripcion: string | null },
  ): Promise<PhotoRecord> {
    this.added.push({ author, photo });
    return buildPhoto({ autorNombre: author.nombre, descripcion: photo.descripcion });
  }

  async find(): Promise<{ id: number; companyUserId: number | null } | null> {
    return this.options.photo === undefined
      ? { id: PHOTO_ID, companyUserId: MEMBERSHIP_ID }
      : this.options.photo;
  }

  async deactivate(photoId: number): Promise<void> {
    this.deactivated.push(photoId);
  }

  async uploadExists(): Promise<boolean> {
    return this.options.uploadExists ?? true;
  }
}

export class FakeFileStorage implements FileStoragePort {
  readonly saved: FileToStore[] = [];

  async save(file: FileToStore): Promise<StoredFile> {
    this.saved.push(file);
    return { url: `/uploads/${file.filename}`, key: file.filename };
  }

  async remove(): Promise<void> {
    // Nothing to do: the double keeps no files.
  }
}
