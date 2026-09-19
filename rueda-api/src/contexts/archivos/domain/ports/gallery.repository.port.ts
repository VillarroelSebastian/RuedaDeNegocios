/** A picture as the gallery shows it. */
export interface PhotoRecord {
  id: number;
  urlFoto: string;
  descripcion: string | null;
  autorNombre: string;
  fechaCreacion: Date;
}

export interface GalleryFilters {
  limit: number;
  /** Only what the event team itself photographed. */
  soloTecnicos: boolean;
}

/** Who is uploading, resolved from the token rather than from the request. */
export interface PhotoAuthor {
  companyUserId: number | null;
  userId: number | null;
  nombre: string;
}

export interface GalleryRepositoryPort {
  findPrincipalEventId(): Promise<number | null>;

  list(eventId: number, filters: GalleryFilters): Promise<PhotoRecord[]>;

  /** The participant uploading, only when their company is cleared to be here. */
  findGrantedMembership(
    companyUserId: number,
    eventId: number,
  ): Promise<{ id: number; nombre: string } | null>;
  /** A member of the event team uploading. */
  findStaffAuthor(userId: number): Promise<{ id: number; nombre: string } | null>;

  add(
    eventId: number,
    author: PhotoAuthor,
    photo: { urlFoto: string; descripcion: string | null },
  ): Promise<PhotoRecord>;

  find(photoId: number): Promise<{ id: number; companyUserId: number | null } | null>;
  deactivate(photoId: number): Promise<void>;

  /** Whether that file really sits in our own uploads folder. */
  uploadExists(filename: string): Promise<boolean>;
}

export const GALLERY_REPOSITORY = Symbol('GalleryRepositoryPort');
