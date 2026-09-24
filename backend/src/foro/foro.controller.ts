import { BadRequestException, Body, Controller, Get, Post, Put, Req } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';

@Controller()
export class ForoController {
  constructor(private readonly prisma: PrismaService) {}
  @Post('public/registro-foro')
  async registrar(@Body() body: Record<string, unknown>) {
    const nombres = String(body.nombres || '').trim();
    const apellidoPaterno = String(body.apellidoPaterno || '').trim();
    const correo = String(body.correo || '').trim().toLowerCase();
    const telefono = String(body.telefono || '').trim();
    const contrasenia = String(body.contrasenia || '');
    if (!nombres || nombres.length > 105 || !apellidoPaterno || apellidoPaterno.length > 65 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) || correo.length > 105 ||
        !telefono || telefono.length > 45 || contrasenia.length < 8 || Buffer.byteLength(contrasenia) > 72)
      throw new BadRequestException('Completa tus datos y usa una contraseña de al menos 8 caracteres (máximo 72 bytes).');
    const evento = await this.prisma.evento.findFirst({ where: { esPrincipal: 1, estaActivo: { not: 0 } } });
    if (!evento) throw new BadRequestException('No hay un evento activo.');
    const hash = await bcrypt.hash(contrasenia, 10);
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1::int AS locked FROM (SELECT pg_advisory_xact_lock(hashtext(${correo}))) AS lock_row`;
      if (await tx.usuario.findFirst({ where: { correo: { equals: correo, mode: 'insensitive' } } }))
        throw new BadRequestException('Este correo ya tiene una cuenta. Inicia sesión o recupera tu contraseña.');
      await tx.usuario.create({ data: {
        nombres, apellidoPaterno, correo, telefono, contrasenia: hash,
        urlFotoPerfil: '', rolEvento: 'FORO', evento_id: evento.id, estaActivo: 1,
      } });
    });
    return { ok: true };
  }
  @Get('foro/contenido')
  async contenido(@Req() req: any) {
    const eventoId = req.user.eventoId;
    const [evento, actividades, noticias] = await Promise.all([
      this.prisma.evento.findFirst({ where: { id: eventoId, estaActivo: { not: 0 } },
        select: { id: true, nombre: true, sobreElEvento: true, fechaInicioEvento: true, fechaFinEvento: true, urlLogoEvento: true } }),
      this.prisma.actividadprograma.findMany({ where: { evento_id: eventoId, estaActivo: 1 },
        orderBy: [{ fechaActividad: 'asc' }, { horaInicioActividad: 'asc' }] }),
      this.prisma.noticia.findMany({ where: { evento_id: eventoId, estaActivo: 1,
        estadoPublicacion: 'PUBLICADO', fechaHoraPublicacion: { lte: new Date() } },
        orderBy: { fechaHoraPublicacion: 'desc' }, take: 100 }),
    ]);
    return { evento, actividades, noticias };
  }
  @Get('foro/perfil')
  perfil(@Req() req: any) {
    return this.prisma.usuario.findUnique({ where: { id: req.user.sub },
      select: { id: true, nombres: true, apellidoPaterno: true, correo: true, telefono: true, rolEvento: true } });
  }
  @Put('foro/perfil')
  async actualizar(@Req() req: any, @Body() body: any) {
    const nombres = String(body.nombres || '').trim();
    const apellidoPaterno = String(body.apellidoPaterno || '').trim();
    const telefono = String(body.telefono || '').trim();
    if (!nombres || nombres.length > 105 || !apellidoPaterno || apellidoPaterno.length > 65 || !telefono || telefono.length > 45)
      throw new BadRequestException('Completa nombre, apellido y teléfono.');
    await this.prisma.usuario.update({ where: { id: req.user.sub }, data: { nombres, apellidoPaterno, telefono } });
    return this.perfil(req);
  }
}
