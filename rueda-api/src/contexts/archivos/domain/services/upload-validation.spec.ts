import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../../../shared/domain/errors/domain.error.js';
import { MAX_UPLOAD_BYTES, assertAllowedUpload, isOwnUploadUrl } from './upload-validation.js';

/** Minimal buffers that carry the signature each format is recognised by. */
function pngOf(width: number, height: number): Buffer {
  const buffer = Buffer.alloc(32);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(buffer);
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

function jpegOf(width: number, height: number): Buffer {
  const buffer = Buffer.alloc(24);
  // Start of image, immediately followed by one SOF0 segment: the marker that
  // carries the size. `ff` at index 2 opens both the signature and the segment.
  buffer[0] = 0xff;
  buffer[1] = 0xd8;
  buffer[2] = 0xff;
  buffer[3] = 0xc0;
  buffer.writeUInt16BE(11, 4);
  buffer[6] = 8;
  buffer.writeUInt16BE(height, 7);
  buffer.writeUInt16BE(width, 9);
  return buffer;
}

const PDF = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(64)]);

describe('assertAllowedUpload', () => {
  it('accepts a PNG and names the extension it is stored with', () => {
    const upload = assertAllowedUpload('image/png', pngOf(800, 600), 1024);

    expect(upload).toEqual({ mime: 'image/png', extension: '.png' });
  });

  it('accepts a JPEG', () => {
    expect(assertAllowedUpload('image/jpeg', jpegOf(800, 600), 1024).extension).toBe('.jpg');
  });

  it('accepts a PDF', () => {
    expect(assertAllowedUpload('application/pdf', PDF, 1024).extension).toBe('.pdf');
  });

  /**
   * Browsers and mobile pickers often hand a PDF over as a generic binary. The
   * header inside the file is what settles it, not the type that was claimed.
   */
  it('reads a PDF handed over as a generic binary', () => {
    expect(assertAllowedUpload('application/octet-stream', PDF, 1024).mime).toBe(
      'application/pdf',
    );
  });

  it('refuses a generic binary that is not a PDF', () => {
    expect(() => assertAllowedUpload('application/octet-stream', pngOf(10, 10), 1024)).toThrow(
      'Formato no permitido. Usa JPG, PNG, WEBP o PDF.',
    );
  });

  it('refuses a format that is not allowed', () => {
    expect(() => assertAllowedUpload('image/svg+xml', pngOf(10, 10), 1024)).toThrow(
      ValidationError,
    );
  });

  /** The claimed type means nothing; the bytes have to back it up. */
  it('refuses content that does not match the type it claims', () => {
    expect(() => assertAllowedUpload('image/png', jpegOf(800, 600), 1024)).toThrow(
      'El contenido del archivo no coincide con su formato.',
    );
  });

  it('refuses a file larger than the limit', () => {
    expect(() =>
      assertAllowedUpload('image/png', pngOf(800, 600), MAX_UPLOAD_BYTES + 1),
    ).toThrow('El archivo no debe superar 10 MB.');
  });

  describe('the size of the image itself', () => {
    it('refuses an image wider or taller than the limit', () => {
      expect(() => assertAllowedUpload('image/png', pngOf(13_000, 600), 1024)).toThrow(
        'La imagen tiene dimensiones inválidas o excesivas.',
      );
    });

    /** A modest width and height can still multiply into a decompression bomb. */
    it('refuses an image with too many pixels overall', () => {
      expect(() => assertAllowedUpload('image/png', pngOf(9000, 9000), 1024)).toThrow(
        ValidationError,
      );
    });

    it('refuses an image whose size cannot be read', () => {
      const headerOnly = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

      expect(() => assertAllowedUpload('image/png', headerOnly, 1024)).toThrow(ValidationError);
    });

    it('asks nothing of a PDF, which has no pixels', () => {
      expect(() => assertAllowedUpload('application/pdf', PDF, 1024)).not.toThrow();
    });
  });
});

describe('isOwnUploadUrl', () => {
  const hosts = ['api.test', 'cdn.test'];

  it('accepts a file served by us', () => {
    expect(isOwnUploadUrl('https://api.test/uploads/foto.png', hosts)).toBe('foto.png');
  });

  it('refuses a file served by somebody else', () => {
    expect(isOwnUploadUrl('https://evil.test/uploads/foto.png', hosts)).toBeNull();
  });

  it('refuses anything outside the uploads folder', () => {
    expect(isOwnUploadUrl('https://api.test/etc/passwd', hosts)).toBeNull();
  });

  /** A name with a path in it would reach outside the folder. */
  it('refuses a name that tries to climb out of the folder', () => {
    expect(isOwnUploadUrl('https://api.test/uploads/..%2F..%2Fetc%2Fpasswd', hosts)).toBeNull();
    expect(isOwnUploadUrl('https://api.test/uploads/sub/foto.png', hosts)).toBeNull();
  });

  it('refuses a protocol that is not web', () => {
    expect(isOwnUploadUrl('file:///uploads/foto.png', hosts)).toBeNull();
  });

  it('refuses something that is not a URL', () => {
    expect(isOwnUploadUrl('foto.png', hosts)).toBeNull();
  });
});
