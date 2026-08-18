import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { writeFileSync, mkdirSync } from 'fs';
import { join, extname } from 'path';
import { randomBytes } from 'crypto';

@Controller('admin/imagenes')
export class ImagenesController {
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('No se proporcionó ningún archivo');
    const permitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (!permitidos.includes(file.mimetype))
      throw new BadRequestException('Formato no permitido. Usa JPG, PNG, WEBP, GIF o PDF.');
    if (file.size > 5 * 1024 * 1024)
      throw new BadRequestException('El archivo no debe superar 5 MB.');

    const uploadsDir = join(process.cwd(), 'uploads');
    mkdirSync(uploadsDir, { recursive: true });

    const ext = extname(file.originalname) || '.bin';
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
