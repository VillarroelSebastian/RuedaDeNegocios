import { BadRequestException, Body, Controller, Delete, Get, Post, Req } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { PushService } from './push.service.js';

@Controller('push')
export class PushController {
  constructor(private readonly prisma: PrismaService, private readonly push: PushService) {}
  @Get('config')
  config() { return { publicKey: this.push.publicKey }; }
  @Post('suscripcion')
  async registrar(@Req() req: any, @Body() body: any) {
    const tipo = body.tipo;
    const destino = String(body.token || body.endpoint || '');
    let p256dh: string | null = null, auth: string | null = null;
    if (tipo === 'expo') {
      if (!/^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/.test(destino) || destino.length > 255)
        throw new BadRequestException('Token push inválido.');
    } else if (tipo === 'web') {
      if (!this.push.publicKey) throw new BadRequestException('Las notificaciones web aún no están configuradas.');
      let url: URL;
      try { url = new URL(destino); } catch { throw new BadRequestException('Suscripción inválida.'); }
      const host = url.hostname.toLowerCase();
      const permitido = host === 'fcm.googleapis.com' || host === 'updates.push.services.mozilla.com' ||
        host === 'web.push.apple.com' || host.endsWith('.notify.windows.com');
      p256dh = String(body.keys?.p256dh || '');
      auth = String(body.keys?.auth || '');
      if (url.protocol !== 'https:' || url.port || url.username || url.password || !permitido ||
          destino.length > 2048 || !/^[A-Za-z0-9_=-]{80,100}$/.test(p256dh) || !/^[A-Za-z0-9_=-]{20,30}$/.test(auth))
        throw new BadRequestException('Suscripción web inválida.');
    } else throw new BadRequestException('Tipo de suscripción inválido.');
    const clave = createHash('sha256').update(destino).digest('hex');
    const data = { usuarioId: req.user.sub, tipo, destino, p256dh, auth, actualizado: new Date() };
    const actual = await this.prisma.pushsubscription.findUnique({ where: { clave } });
    if (!actual && await this.prisma.pushsubscription.count({ where: { usuarioId: req.user.sub } }) >= 20)
      throw new BadRequestException('Se alcanzó el límite de dispositivos. Desactiva uno antes de agregar otro.');
    await this.prisma.pushsubscription.upsert({ where: { clave }, create: { ...data, clave }, update: data });
    return { ok: true };
  }
  @Delete('suscripcion')
  async eliminar(@Req() req: any, @Body() body: any) {
    const clave = createHash('sha256').update(String(body.token || body.endpoint || '')).digest('hex');
    await this.prisma.pushsubscription.deleteMany({ where: { clave, usuarioId: req.user.sub } });
    return { ok: true };
  }
}
