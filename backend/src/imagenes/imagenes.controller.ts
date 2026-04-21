import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';

cloudinary.config({
  cloud_name: 'dk5u8dljb',
  api_key: '469869626472537',
  api_secret: 'b0j3UEP2_AxbfLPgvVAqRmazQBg',
});

@Controller('admin/imagenes')
export class ImagenesController {
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'rueda-negocios', resource_type: 'auto' },
        (error, result) => {
          if (error || !result) return reject(new BadRequestException(error?.message || 'Error al subir a Cloudinary'));
          resolve({ url: result.secure_url });
        },
      );
      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }
}
