import { Injectable } from '@nestjs/common';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { FileStoragePort, FileToStore, StoredFile } from '../../application/ports/file-storage.port.js';

/** Root of the statically served `uploads/` directory, same layout as the legacy backend. */
export const UPLOADS_ROOT = join(process.cwd(), 'uploads');

@Injectable()
export class LocalFileStorageAdapter implements FileStoragePort {
  async save(file: FileToStore): Promise<StoredFile> {
    const folder = sanitizeSegment(file.folder);
    const filename = sanitizeSegment(file.filename);

    await mkdir(join(UPLOADS_ROOT, folder), { recursive: true });
    await writeFile(join(UPLOADS_ROOT, folder, filename), file.content);

    return { key: `${folder}/${filename}`, url: `/uploads/${folder}/${filename}` };
  }

  async remove(key: string): Promise<void> {
    const safeKey = key.split('/').map(sanitizeSegment).join('/');
    await rm(join(UPLOADS_ROOT, safeKey), { force: true });
  }
}

/** Strips path traversal so a caller-supplied name can never escape `uploads/`. */
function sanitizeSegment(segment: string): string {
  return segment.replace(/[/\\]/g, '_').replace(/\.{2,}/g, '_');
}
