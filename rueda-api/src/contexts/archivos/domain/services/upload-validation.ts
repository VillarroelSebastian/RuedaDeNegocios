import { ValidationError } from '../../../../shared/domain/errors/domain.error.js';

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** What the event ever needs to accept: pictures and payment receipts. */
const EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

/** Types a browser may hand a PDF over as. */
const MAYBE_PDF = ['application/pdf', 'application/x-pdf', 'application/octet-stream', ''];

/** Beyond this an image is either a mistake or a decompression bomb. */
const MAX_SIDE = 12_000;
const MAX_PIXELS = 40_000_000;

const WRONG_FORMAT = 'Formato no permitido. Usa JPG, PNG, WEBP o PDF.';
const CONTENT_MISMATCH = 'El contenido del archivo no coincide con su formato.';
const BAD_DIMENSIONS = 'La imagen tiene dimensiones inválidas o excesivas.';

export interface AllowedUpload {
  mime: string;
  extension: string;
}

interface Size {
  width: number;
  height: number;
}

/** The signature each format starts with. A claimed type proves nothing. */
const SIGNATURES: Record<string, (content: Buffer) => boolean> = {
  'image/jpeg': (content) =>
    content[0] === 0xff && content[1] === 0xd8 && content[2] === 0xff,
  'image/png': (content) =>
    content.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  'image/webp': (content) =>
    content.subarray(0, 4).toString() === 'RIFF' &&
    content.subarray(8, 12).toString() === 'WEBP',
  'application/pdf': (content) => looksLikePdf(content),
};

function looksLikePdf(content: Buffer): boolean {
  return content.subarray(0, 1024).indexOf(Buffer.from('%PDF-')) >= 0;
}

/**
 * Checks an upload before it is written anywhere: the type has to be one we
 * accept, the bytes have to back that type up, and an image has to be of a size
 * a human could have produced.
 */
export function assertAllowedUpload(
  claimedMime: string,
  content: Buffer,
  size: number,
): AllowedUpload {
  const claimed = String(claimedMime ?? '').toLowerCase();
  // Browsers and mobile pickers often hand a PDF over as a generic binary, so
  // the header inside the file settles it rather than the type that was claimed.
  const mime = looksLikePdf(content) && MAYBE_PDF.includes(claimed) ? 'application/pdf' : claimed;

  const extension = EXTENSIONS[mime];
  if (!extension) throw new ValidationError(WRONG_FORMAT);

  if (size > MAX_UPLOAD_BYTES) {
    throw new ValidationError('El archivo no debe superar 10 MB.');
  }
  if (!SIGNATURES[mime](content)) throw new ValidationError(CONTENT_MISMATCH);

  if (mime !== 'application/pdf') assertReasonableSize(sizeOf(mime, content));

  return { mime, extension };
}

function assertReasonableSize({ width, height }: Size): void {
  // A size that cannot be read means the file is not the picture it claims.
  if (!width || !height) throw new ValidationError(BAD_DIMENSIONS);
  if (width > MAX_SIDE || height > MAX_SIDE || width * height > MAX_PIXELS) {
    throw new ValidationError(BAD_DIMENSIONS);
  }
}

/** Reads the pixel size out of the header of each format. */
function sizeOf(mime: string, content: Buffer): Size {
  if (mime === 'image/png') return pngSize(content);
  if (mime === 'image/jpeg') return jpegSize(content);
  if (mime === 'image/webp') return webpSize(content);

  return { width: 0, height: 0 };
}

function pngSize(content: Buffer): Size {
  if (content.length < 24) return { width: 0, height: 0 };

  return { width: content.readUInt32BE(16), height: content.readUInt32BE(20) };
}

/** JPEG stores its size inside one of the start-of-frame segments. */
const JPEG_FRAME_MARKERS = [
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
];

function jpegSize(content: Buffer): Size {
  let cursor = 2;

  while (cursor + 9 < content.length) {
    if (content[cursor] !== 0xff) {
      cursor += 1;
      continue;
    }

    const marker = content[cursor + 1];
    const segment = content.readUInt16BE(cursor + 2);
    if (segment < 2) break;

    if (JPEG_FRAME_MARKERS.includes(marker)) {
      return {
        width: content.readUInt16BE(cursor + 7),
        height: content.readUInt16BE(cursor + 5),
      };
    }

    cursor += 2 + segment;
  }

  return { width: 0, height: 0 };
}

function webpSize(content: Buffer): Size {
  if (content.length < 30) return { width: 0, height: 0 };

  const kind = content.subarray(12, 16).toString();

  if (kind === 'VP8X') {
    return {
      width: 1 + content[24] + (content[25] << 8) + (content[26] << 16),
      height: 1 + content[27] + (content[28] << 8) + (content[29] << 16),
    };
  }
  if (kind === 'VP8 ' && content[23] === 0x9d && content[24] === 0x01 && content[25] === 0x2a) {
    return {
      width: content.readUInt16LE(26) & 0x3fff,
      height: content.readUInt16LE(28) & 0x3fff,
    };
  }
  if (kind === 'VP8L' && content[20] === 0x2f) {
    return {
      width: 1 + content[21] + ((content[22] & 0x3f) << 8),
      height:
        1 + ((content[22] & 0xc0) >> 6) + (content[23] << 2) + ((content[24] & 0x0f) << 10),
    };
  }

  return { width: 0, height: 0 };
}

const UPLOADS_PATH = '/uploads/';
/** A stored file is one flat name; anything with a path in it is not ours. */
const FILENAME_SHAPE = /^[a-zA-Z0-9._-]+$/;

/**
 * Whether a URL points at a file this API itself stored, and which file that
 * is. Anything else — another host, another folder, a name that climbs out of
 * it — is somebody else's address wearing our clothes.
 */
export function isOwnUploadUrl(value: unknown, allowedHosts: string[]): string | null {
  let url: URL;
  try {
    url = new URL(typeof value === 'string' ? value : '');
  } catch {
    return null;
  }

  if (!['http:', 'https:'].includes(url.protocol)) return null;
  if (!allowedHosts.includes(url.host)) return null;
  if (!url.pathname.startsWith(UPLOADS_PATH)) return null;

  let filename: string;
  try {
    filename = decodeURIComponent(url.pathname.slice(UPLOADS_PATH.length));
  } catch {
    return null;
  }

  return FILENAME_SHAPE.test(filename) ? filename : null;
}
