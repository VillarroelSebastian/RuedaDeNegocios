import { Controller, Get, Post, Put, Delete, Body, Param, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AppService } from './app.service.js';
import { PrismaService } from './prisma/prisma.service.js';
import * as bcrypt from 'bcrypt';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('auth/login')
  async login(@Body() body: { correo: string; contrasenia: string }) {
    const user = await this.prisma.usuario.findFirst({
      where: { correo: body.correo },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isValid = await bcrypt.compare(body.contrasenia, user.contrasenia);
    if (!isValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return {
      id: user.id,
      correo: user.correo,
      nombres: user.nombres,
      rolEvento: user.rolEvento,
      urlFotoPerfil: user.urlFotoPerfil,
    };
  }

  @Get('admin/dashboard/stats')
  async getDashboardStats() {
    const empresasCount = await this.prisma.empresa.count({ where: { estaActivo: 1 } });
    const pagosCount = await this.prisma.empresaevento.count({ 
      where: { estadoVerificacionPago: "COMPLETADO", estaActivo: 1 } 
    });
    const reunionesCount = await this.prisma.reunion.count({ where: { estaActivo: 1 } });
    const mesasCount = await this.prisma.mesa.count({ where: { estaActivo: 1 } });

    const recentActivityRaw = await this.prisma.empresaevento.findMany({
      take: 4,
      orderBy: { fechaCreacion: 'desc' },
      include: { empresa: true, evento: true }
    });

    const recentActivity = recentActivityRaw.map(ee => ({
      id: ee.id,
      user: ee.empresa.nombre,
      subtext: ee.empresa.rubro,
      action: ee.tipoParticipacion,
      table: '-',
      time: ee.fechaCreacion.toISOString(),
      status: ee.estadoVerificacionPago,
      initials: ee.empresa.nombre.substring(0, 2).toUpperCase(),
      avatarBg: 'bg-green-200',
      statusColors: ee.estadoVerificacionPago === 'COMPLETADO' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
    }));

    return {
      stats: [
        { name: 'Empresas', value: empresasCount.toString(), change: '+0%', color: 'text-green-600', bg: 'bg-green-100', icon: '🏢' },
        { name: 'Pagos', value: pagosCount.toString(), change: '+0%', color: 'text-orange-500', bg: 'bg-orange-100', icon: '💳' },
        { name: 'Reuniones', value: reunionesCount.toString(), change: '+0%', color: 'text-blue-500', bg: 'bg-blue-100', icon: '🤝' },
        { name: 'Mesas', value: mesasCount.toString(), change: '0%', color: 'text-purple-500', bg: 'bg-purple-100', icon: '🪑' },
      ],
      recentActivity
    };
  }

  @Get('admin/eventos')
  async getEventos() {
    return await this.prisma.evento.findMany({
      where: { estaActivo: { not: 0 } },
      orderBy: [
        { esPrincipal: 'desc' },
        { fechaCreacion: 'desc' }
      ]
    });
  }

  @Get('admin/eventos/:id')
  async getEventoById(@Param('id') id: string) {
    const evento = await this.prisma.evento.findUnique({
      where: { id: Number(id) },
      include: { eventoreglaqr: true },
    });
    if (!evento) return {};
    return evento;
  }

  @Post('admin/eventos')
  async createEvento(@Body() body: any) {
    const { reglasQR, ...eventoData } = body;
    
    // Check if this is the first active event
    const activeCount = await this.prisma.evento.count({
      where: { estaActivo: { not: 0 } }
    });

    const isFirst = activeCount === 0;

    const evento = await this.prisma.evento.create({
      data: {
        ...eventoData,
        estaActivo: 1,
        esPrincipal: isFirst ? 1 : 0,
        eventoreglaqr: {
          create: reglasQR || []
        }
      }
    });
    return evento;
  }

  @Put('admin/eventos/:id')
  async updateEvento(@Param('id') id: string, @Body() body: any) {
    const { reglasQR, id: _dropId, ...eventoData } = body;
    const eventId = Number(id);

    const evento = await this.prisma.evento.update({
      where: { id: eventId },
      data: eventoData,
    });
    
    if (reglasQR && Array.isArray(reglasQR)) {
      await this.prisma.eventoreglaqr.deleteMany({
        where: { evento_id: eventId }
      });
      if (reglasQR.length > 0) {
        await this.prisma.eventoreglaqr.createMany({
          data: reglasQR.map((r: any) => ({
            ...r,
            evento_id: eventId,
          }))
        });
      }
    }

    return await this.prisma.evento.findUnique({
      where: { id: eventId },
      include: { eventoreglaqr: true },
    });
  }

  @Put('admin/eventos/:id/set-principal')
  async setEventoPrincipal(@Param('id') id: string) {
    const eventId = Number(id);
    
    // Unset all
    await this.prisma.evento.updateMany({
      where: {}, 
      data: { esPrincipal: 0 }
    });

    // Set target
    return await this.prisma.evento.update({
      where: { id: eventId },
      data: { esPrincipal: 1 }
    });
  }

  @Delete('admin/eventos/:id')
  async deleteEvento(@Param('id') id: string) {
    const eventId = Number(id);
    
    const evento = await this.prisma.evento.findUnique({ where: { id: eventId } });
    if (!evento) throw new BadRequestException('Evento no encontrado');
    if (evento.esPrincipal === 1) {
      throw new BadRequestException('No puedes eliminar el evento principal. Haz otro evento principal primero.');
    }

    return await this.prisma.evento.update({
      where: { id: eventId },
      data: { estaActivo: 0 }
    });
  }
}
