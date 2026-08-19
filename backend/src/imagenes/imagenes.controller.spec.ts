import { BadRequestException } from '@nestjs/common';
import { ImagenesController } from './imagenes.controller.js';

describe('ImagenesController', () => {
  const controller = new ImagenesController();
  const req = { headers: { host: 'localhost:3334' } };

  it('rechaza contenido ejecutable disfrazado de imagen', async () => {
    const file = { mimetype: 'image/png', size: 20, originalname: 'foto.png', buffer: Buffer.from('<script>alert(1)</script>') } as Express.Multer.File;
    await expect(controller.uploadImage(file, req)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza dimensiones excesivas antes de guardar', async () => {
    const buffer = Buffer.alloc(32); Buffer.from([137,80,78,71,13,10,26,10]).copy(buffer); buffer.writeUInt32BE(20000, 16); buffer.writeUInt32BE(20000, 20);
    const file = { mimetype: 'image/png', size: buffer.length, originalname: 'grande.png', buffer } as Express.Multer.File;
    await expect(controller.uploadImage(file, req)).rejects.toBeInstanceOf(BadRequestException);
  });
});
