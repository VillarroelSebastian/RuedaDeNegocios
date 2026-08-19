import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { writeFileSync, mkdirSync } from 'fs';
import { join, extname } from 'path';
import { randomBytes } from 'crypto';

@Controller()
export class ImagenesController {
  private validarDimensiones(mime: string, b: Buffer) {
    let width = 0, height = 0;
    if (mime === 'image/png' && b.length >= 24) { width = b.readUInt32BE(16); height = b.readUInt32BE(20); }
    if (mime === 'image/jpeg') {
      let i = 2;
      while (i + 9 < b.length) {
        if (b[i] !== 0xff) { i++; continue; }
        const marker = b[i + 1], size = b.readUInt16BE(i + 2);
        if (size < 2) break;
        if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) {
          height = b.readUInt16BE(i + 5); width = b.readUInt16BE(i + 7); break;
        }
        i += 2 + size;
      }
    }
    if (mime === 'image/webp' && b.length >= 30) {
      const kind = b.subarray(12, 16).toString();
      if (kind === 'VP8X') {
        width = 1 + b[24] + (b[25] << 8) + (b[26] << 16);
        height = 1 + b[27] + (b[28] << 8) + (b[29] << 16);
      } else if (kind === 'VP8 ' && b.length >= 30 && b[23] === 0x9d && b[24] === 0x01 && b[25] === 0x2a) {
        width = b.readUInt16LE(26) & 0x3fff; height = b.readUInt16LE(28) & 0x3fff;
      } else if (kind === 'VP8L' && b.length >= 25 && b[20] === 0x2f) {
        width = 1 + b[21] + ((b[22] & 0x3f) << 8);
        height = 1 + ((b[22] & 0xc0) >> 6) + (b[23] << 2) + ((b[24] & 0x0f) << 10);
      }
    }
    if ((width && (width > 12000 || height > 12000 || width * height > 40_000_000)) || (mime !== 'application/pdf' && (!width || !height)))
      throw new BadRequestException('La imagen tiene dimensiones inválidas o excesivas.');
  }
  @Post(['admin/imagenes/upload', 'public/imagenes/upload'])
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('No se proporcionó ningún archivo');
    const permitidos = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!permitidos.includes(file.mimetype))
      throw new BadRequestException('Formato no permitido. Usa JPG, PNG, WEBP, GIF o PDF.');
    if (file.size > 5 * 1024 * 1024)
      throw new BadRequestException('El archivo no debe superar 5 MB.');

    const uploadsDir = join(process.cwd(), 'uploads');
    mkdirSync(uploadsDir, { recursive: true });

    const signatures: Record<string, (b: Buffer) => boolean> = {
      'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
      'image/png': (b) => b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])),
      'image/webp': (b) => b.subarray(0,4).toString() === 'RIFF' && b.subarray(8,12).toString() === 'WEBP',
      'application/pdf': (b) => b.subarray(0,5).toString() === '%PDF-',
    };
    if (!signatures[file.mimetype]?.(file.buffer)) throw new BadRequestException('El contenido del archivo no coincide con su formato.');
    this.validarDimensiones(file.mimetype, file.buffer);
    const extensions: Record<string, string> = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'application/pdf': '.pdf' };
    const ext = extensions[file.mimetype];
    const filename = `${Date.now()}-${randomBytes(8).toString('hex')}${ext}`;
    writeFileSync(join(uploadsDir, filename), file.buffer);

    // En producción PUBLIC_URL define la base (ej: https://api.midominio.com).
    // Sin PUBLIC_URL se respetan los headers del proxy (x-forwarded-*) y,
    // en último caso, el host del request (localhost / red local en desarrollo).
    let base = process.env.PUBLIC_URL;
    if (!base) {
      const proto = req.headers['x-forwarded-proto'] ?? 'http';
      const host = req.headers['x-forwarded-host'] ?? req.headers['host'] ?? `localhost:${process.env.PORT ?? 3334}`;
      base = `${proto}://${host}`;
    }
    const url = `${base.replace(/\/$/, '')}/uploads/${filename}`;

    return { url };
  }
}
