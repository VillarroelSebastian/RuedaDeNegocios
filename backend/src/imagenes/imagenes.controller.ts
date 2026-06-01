import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { writeFileSync, mkdirSync } from 'fs';
import { join, extname } from 'path';
import { randomBytes } from 'crypto';

@Controller('admin/imagenes')
export class ImagenesController {
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('No se proporcionó ningún archivo');

    const uploadsDir = join(process.cwd(), 'uploads');
    mkdirSync(uploadsDir, { recursive: true });

    const ext = extname(file.originalname) || '.bin';
    const filename = `${Date.now()}-${randomBytes(8).toString('hex')}${ext}`;
    writeFileSync(join(uploadsDir, filename), file.buffer);

    // Usar el host del request para que funcione tanto desde localhost como desde móvil en red local
    const host = req.headers['host'] ?? `localhost:${process.env.PORT ?? 3334}`;
    const url = `http://${host}/uploads/${filename}`;

    return { url };
  }
}
