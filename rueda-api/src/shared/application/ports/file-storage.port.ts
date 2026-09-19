export interface StoredFile {
  /** Public path served by the API, e.g. `/uploads/comprobantes/abc.pdf`. */
  url: string;
  /** Path on the storage backend, relative to its root. */
  key: string;
}

export interface FileToStore {
  folder: string;
  filename: string;
  content: Buffer;
  mimeType: string;
}

/** Persists uploaded files. Implemented over the local `uploads/` directory. */
export interface FileStoragePort {
  save(file: FileToStore): Promise<StoredFile>;
  remove(key: string): Promise<void>;
}

export const FILE_STORAGE_PORT = Symbol('FileStoragePort');
