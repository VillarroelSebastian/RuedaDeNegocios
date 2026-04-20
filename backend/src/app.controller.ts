import { Controller, Get, Post, Put, Delete, Body, Param, UnauthorizedException, BadRequestException, Query } from '@nestjs/common';
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

  // ─── AUTH ───────────────────────────────────────────────────────────────────

  @Post('auth/login')
  async login(@Body() body: { correo: string; contrasenia: string }) {
    const user = await this.prisma.usuario.findFirst({
      where: { correo: body.correo, estaActivo: 1 },
    });

    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    const isValid = await bcrypt.compare(body.contrasenia, user.contrasenia);
    if (!isValid) throw new UnauthorizedException('Credenciales inválidas');

    if (user.rolEvento === 'TECNICO') {
      const eventoId = await this.getPrincipalEventoId();
      if (user.evento_id !== eventoId) {
        throw new UnauthorizedException('Tu cuenta no está habilitada para el evento activo actualmente.');
      }
    }

    return {
      id: user.id,
      correo: user.correo,
      nombres: user.nombres,
      apellidoPaterno: user.apellidoPaterno,
      apellidoMaterno: user.apellidoMaterno,
      telefono: user.telefono,
      rolEvento: user.rolEvento,
      urlFotoPerfil: user.urlFotoPerfil,
      evento_id: user.evento_id,
    };
  }

  // ─── PÚBLICO (sin auth) ──────────────────────────────────────────────────────

  @Get('public/evento')
  async getPublicEvento() {
    const evento = await this.prisma.evento.findFirst({
      where: { esPrincipal: 1, estaActivo: { not: 0 } },
    });
    if (!evento) return null;

    const [empresasCount, mesasCount, actividadesCount, tecnicosCount] = await Promise.all([
      this.prisma.empresaevento.count({ where: { evento_id: evento.id, estaActivo: 1 } }),
      this.prisma.mesa.count({ where: { evento_id: evento.id, estaActivo: 1 } }),
      this.prisma.actividadprograma.count({ where: { evento_id: evento.id, estaActivo: 1 } }),
      this.prisma.usuario.count({ where: { evento_id: evento.id, estaActivo: 1, rolEvento: 'TECNICO' } }),
    ]);

    return { ...evento, stats: { empresasCount, mesasCount, actividadesCount, tecnicosCount } };
  }

  @Get('public/actividades')
  async getPublicActividades() {
    const eventoId = await this.getPrincipalEventoId();
    if (!eventoId) return [];
    return this.prisma.actividadprograma.findMany({
      where: { evento_id: eventoId, estaActivo: 1 },
      orderBy: [{ fechaActividad: 'asc' }, { horaInicioActividad: 'asc' }],
    });
  }

  // ─── HELPER: get principal event id ─────────────────────────────────────────

  private async getPrincipalEventoId(): Promise<number | null> {
    const evento = await this.prisma.evento.findFirst({
      where: { esPrincipal: 1, estaActivo: { not: 0 } },
    });
    return evento?.id ?? null;
  }

  // ─── DASHBOARD ───────────────────────────────────────────────────────────────

  @Get('admin/dashboard/stats')
  async getDashboardStats() {
    const eventoId = await this.getPrincipalEventoId();

    const eventoFilter = eventoId ? { evento_id: eventoId } : {};
    const empresasCount = eventoId
      ? await this.prisma.empresaevento.count({ where: { evento_id: eventoId, estaActivo: 1 } })
      : 0;
    const pagosPendientesCount = await this.prisma.empresaevento.count({
      where: { ...eventoFilter, estadoVerificacionPago: 'PENDIENTE', estaActivo: 1 },
    });
    const reunionesCount = await this.prisma.reunion.count({
      where: { ...eventoFilter, estaActivo: 1 },
    });
    const mesasActivasCount = eventoId
      ? await this.prisma.mesa.count({ where: { estaActivo: 1, evento_id: eventoId } })
      : 0;
    const eventosCount = await this.prisma.evento.count({ where: { estaActivo: { not: 0 } } });

    const recentActivityRaw = await this.prisma.empresaevento.findMany({
      take: 5,
      where: eventoId ? { evento_id: eventoId } : {},
      orderBy: { fechaCreacion: 'desc' },
      include: { empresa: true, evento: true },
    });

    const recentActivity = recentActivityRaw.map((ee) => ({
      id: ee.id,
      user: ee.empresa.nombre,
      subtext: ee.empresa.rubro,
      action: ee.tipoParticipacion,
      table: '-',
      time: ee.fechaCreacion.toISOString(),
      status: ee.estadoVerificacionPago,
      initials: ee.empresa.nombre.substring(0, 2).toUpperCase(),
      avatarBg: 'bg-green-200',
      statusColors:
        ee.estadoVerificacionPago === 'COMPLETADO'
          ? 'bg-green-100 text-green-700'
          : 'bg-orange-100 text-orange-700',
    }));

    return {
      stats: [
        { name: 'Empresas', value: empresasCount.toString(), change: '+0%', color: 'text-green-600', bg: 'bg-green-100', icon: '🏢' },
        { name: 'Pagos Pendientes', value: pagosPendientesCount.toString(), change: '+0%', color: 'text-orange-500', bg: 'bg-orange-100', icon: '💳' },
        { name: 'Reuniones', value: reunionesCount.toString(), change: '+0%', color: 'text-blue-500', bg: 'bg-blue-100', icon: '🤝' },
        { name: 'Mesas Activas', value: mesasActivasCount.toString(), change: '0%', color: 'text-purple-500', bg: 'bg-purple-100', icon: '🪑' },
        { name: 'Eventos', value: eventosCount.toString(), change: '0%', color: 'text-indigo-500', bg: 'bg-indigo-100', icon: '📅' },
      ],
      recentActivity,
      pagosPendientesCount,
    };
  }

  // ─── NOTIFICACIONES ADMIN ────────────────────────────────────────────────────

  @Get('admin/notificaciones')
  async getAdminNotificaciones() {
    const eventoId = await this.getPrincipalEventoId();
    const eventoFilter = eventoId ? { evento_id: eventoId } : {};

    const pagosPendientes = await this.prisma.empresaevento.findMany({
      where: { ...eventoFilter, estadoVerificacionPago: 'PENDIENTE', estaActivo: 1 },
      take: 10,
      orderBy: { fechaCreacion: 'desc' },
      include: { empresa: true },
    });

    const pagosObservados = await this.prisma.empresaevento.findMany({
      where: { ...eventoFilter, estadoVerificacionPago: 'OBSERVADO', estaActivo: 1 },
      take: 5,
      orderBy: { fechaCreacion: 'desc' },
      include: { empresa: true },
    });

    const empresasRecientes = eventoId
      ? await this.prisma.empresa.findMany({
          where: {
            estaActivo: 1,
            empresaevento: { some: { evento_id: eventoId, estaActivo: 1 } },
          },
          take: 5,
          orderBy: { fechaCreacion: 'desc' },
        })
      : [];

    const notificaciones = [
      ...pagosPendientes.map((ee) => ({
        id: `pago-${ee.id}`,
        tipo: 'pago_pendiente',
        titulo: 'Pago pendiente de verificación',
        mensaje: `${ee.empresa.nombre} envió un comprobante de pago`,
        fecha: ee.fechaHoraEnvioComprobante?.toISOString() ?? ee.fechaCreacion.toISOString(),
        enlace: `/admin/pagos/${ee.id}`,
        leida: false,
      })),
      ...pagosObservados.map((ee) => ({
        id: `obs-${ee.id}`,
        tipo: 'pago_observado',
        titulo: 'Pago con observación',
        mensaje: `${ee.empresa.nombre} tiene un pago con observaciones`,
        fecha: ee.fechaCreacion.toISOString(),
        enlace: `/admin/pagos/${ee.id}`,
        leida: false,
      })),
      ...empresasRecientes.map((e) => ({
        id: `emp-${e.id}`,
        tipo: 'empresa_nueva',
        titulo: 'Nueva empresa registrada',
        mensaje: `${e.nombre} (${e.rubro}) se registró en el sistema`,
        fecha: e.fechaCreacion.toISOString(),
        enlace: `/admin/empresas`,
        leida: true,
      })),
    ].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).slice(0, 15);

    return { notificaciones, totalNoLeidas: pagosPendientes.length + pagosObservados.length };
  }

  // ─── EVENTOS ─────────────────────────────────────────────────────────────────

  @Get('admin/eventos')
  async getEventos() {
    return await this.prisma.evento.findMany({
      where: { estaActivo: { not: 0 } },
      orderBy: [{ esPrincipal: 'desc' }, { fechaCreacion: 'desc' }],
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

  private sanitizeEventoData(body: any) {
    const orNull = (v: any) => (v === '' || v === undefined ? null : v);
    return {
      nombre: body.nombre,
      edicion: body.edicion || '',
      descripcion: orNull(body.descripcion),
      fechaInicioEvento: body.fechaInicioEvento ? new Date(body.fechaInicioEvento) : new Date(),
      fechaFinEvento: body.fechaFinEvento ? new Date(body.fechaFinEvento) : new Date(),
      duracionReunion: Number(body.duracionReunion) || 20,
      tiempoEntreReuniones: Number(body.tiempoEntreReuniones) || 5,
      cantidadTotalMesasEvento: Number(body.cantidadTotalMesasEvento) || 50,
      capacidadPersonasPorMesa: Number(body.capacidadPersonasPorMesa) || 4,
      montoBaseIncripcionBolivianos: Number(body.montoBaseIncripcionBolivianos) || 500,
      cantidadParticipantesIncluidos: Number(body.cantidadParticipantesIncluidos) || 2,
      costoParticipanteExtra: Number(body.costoParticipanteExtra) || 100,
      urlImagenMapaRecinto: orNull(body.urlImagenMapaRecinto),
      urlImagenCronogramaCharlas: orNull(body.urlImagenCronogramaCharlas),
      urlLogoEvento: orNull(body.urlLogoEvento),
      sobreElEvento: orNull(body.sobreElEvento),
      correoContacto: orNull(body.correoContacto),
      telefonoContacto: orNull(body.telefonoContacto),
      enlaceFacebook: orNull(body.enlaceFacebook),
      enlaceInstagram: orNull(body.enlaceInstagram),
      enlaceTwitterX: orNull(body.enlaceTwitterX),
    };
  }

  private sanitizeReglasQR(reglasQR: any[]) {
    return reglasQR.map((r: any) => ({
      rangoDesde: Number(r.rangoDesde) || 1,
      rangoHasta: Number(r.rangoHasta) || 1,
      monto: Number(r.monto) || 0,
      urlQR: r.urlQR || '',
    }));
  }

  @Post('admin/eventos')
  async createEvento(@Body() body: any) {
    try {
      const eventoData = this.sanitizeEventoData(body);
      const reglasQR = body.reglasQR;
      const activeCount = await this.prisma.evento.count({ where: { estaActivo: { not: 0 } } });
      const isFirst = activeCount === 0;

      const evento = await this.prisma.evento.create({
        data: {
          ...eventoData,
          estaActivo: 1,
          esPrincipal: isFirst ? 1 : 0,
          eventoreglaqr: {
            create: reglasQR && reglasQR.length > 0 ? this.sanitizeReglasQR(reglasQR) : [],
          },
        },
        include: { eventoreglaqr: true },
      });
      return evento;
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : JSON.stringify(error));
    }
  }

  @Put('admin/eventos/:id')
  async updateEvento(@Param('id') id: string, @Body() body: any) {
    try {
      const eventId = Number(id);
      const eventoData = this.sanitizeEventoData(body);
      const reglasQR = body.reglasQR;

      await this.prisma.evento.update({ where: { id: eventId }, data: eventoData });

      if (reglasQR && Array.isArray(reglasQR)) {
        await this.prisma.eventoreglaqr.deleteMany({ where: { evento_id: eventId } });
        if (reglasQR.length > 0) {
          await this.prisma.eventoreglaqr.createMany({
            data: this.sanitizeReglasQR(reglasQR).map((r) => ({ ...r, evento_id: eventId })),
          });
        }
      }

      return await this.prisma.evento.findUnique({
        where: { id: eventId },
        include: { eventoreglaqr: true },
      });
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : JSON.stringify(error));
    }
  }

  @Put('admin/eventos/:id/set-principal')
  async setEventoPrincipal(@Param('id') id: string) {
    const eventId = Number(id);
    await this.prisma.evento.updateMany({ where: {}, data: { esPrincipal: 0 } });
    return await this.prisma.evento.update({ where: { id: eventId }, data: { esPrincipal: 1 } });
  }

  @Delete('admin/eventos/:id')
  async deleteEvento(@Param('id') id: string) {
    const eventId = Number(id);
    const evento = await this.prisma.evento.findUnique({ where: { id: eventId } });
    if (!evento) throw new BadRequestException('Evento no encontrado');
    if (evento.esPrincipal === 1) {
      throw new BadRequestException('No puedes eliminar el evento principal. Haz otro evento principal primero.');
    }
    return await this.prisma.evento.update({ where: { id: eventId }, data: { estaActivo: 0 } });
  }

  // ─── EMPRESAS ────────────────────────────────────────────────────────────────

  @Get('admin/empresas')
  async getEmpresas(
    @Query('search') search?: string,
    @Query('estadoPago') estadoPago?: string,
    @Query('ciudad') ciudad?: string,
    @Query('rubro') rubro?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const take = Number(limit) || 10;
    const skip = (Number(page) - 1) * take || 0;

    const eventoId = await this.getPrincipalEventoId();

    const where: any = { estaActivo: 1 };
    if (eventoId) where.empresaevento = { some: { evento_id: eventoId, estaActivo: 1 } };
    if (search) where.nombre = { contains: search, mode: 'insensitive' };
    if (rubro) where.rubro = { contains: rubro, mode: 'insensitive' };
    if (ciudad) where.ciudad = { nombre: { contains: ciudad, mode: 'insensitive' } };

    const empresas = await this.prisma.empresa.findMany({
      where,
      skip,
      take,
      orderBy: { fechaCreacion: 'desc' },
      include: {
        ciudad: true,
        empresaevento: eventoId
          ? {
              where: { evento_id: eventoId, estaActivo: 1 },
              include: { empresa_usuario: true },
            }
          : false,
      },
    });

    const total = await this.prisma.empresa.count({ where });

    const result = empresas.map((e) => {
      const ee = e.empresaevento?.[0];
      if (estadoPago && ee?.estadoVerificacionPago !== estadoPago) return null;
      return {
        id: e.id,
        nombre: e.nombre,
        rubro: e.rubro,
        ciudad: e.ciudad.nombre,
        telefonoWhatsapp: e.telefonoWhatsapp,
        correoCorporativo: e.correoCorporativo,
        urlFotoPerfil: e.urlFotoPerfil,
        sitioWeb: e.sitioWeb,
        descripcion: e.descripcion,
        fechaCreacion: e.fechaCreacion,
        participantes: ee?.numeroParticipantes ?? 0,
        estadoVerificacionPago: ee?.estadoVerificacionPago ?? 'SIN_REGISTRO',
        estadoHabilitacionAcceso: ee?.estadoHabilitacionAcceso ?? 'SIN_REGISTRO',
        empresaEventoId: ee?.id ?? null,
        numeroParticipantes: ee?.numeroParticipantes ?? 0,
        montoPagado: ee?.montoPagado ?? null,
      };
    }).filter(Boolean);

    return { data: result, total, page: Number(page) || 1, limit: take };
  }

  @Get('admin/empresas/:id')
  async getEmpresaById(@Param('id') id: string) {
    const eventoId = await this.getPrincipalEventoId();
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: Number(id) },
      include: {
        ciudad: true,
        empresaevento: eventoId
          ? {
              where: { evento_id: eventoId, estaActivo: 1 },
              include: {
                empresa_usuario: { include: { usuario: true } },
                empresaeventocomprobantes: { where: { estaActivo: 1 } },
              },
            }
          : false,
      },
    });
    if (!empresa) throw new BadRequestException('Empresa no encontrada');
    return empresa;
  }

  @Put('admin/empresas/:id')
  async updateEmpresa(@Param('id') id: string, @Body() body: any) {
    try {
      return await this.prisma.empresa.update({
        where: { id: Number(id) },
        data: {
          nombre: body.nombre,
          rubro: body.rubro,
          sitioWeb: body.sitioWeb || null,
          descripcion: body.descripcion || null,
          telefonoWhatsapp: body.telefonoWhatsapp,
          correoCorporativo: body.correoCorporativo,
          urlFotoPerfil: body.urlFotoPerfil || null,
        },
      });
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Error al actualizar empresa');
    }
  }

  @Delete('admin/empresas/:id')
  async deleteEmpresa(@Param('id') id: string) {
    return await this.prisma.empresa.update({
      where: { id: Number(id) },
      data: { estaActivo: 0 },
    });
  }

  // ─── PAGOS ───────────────────────────────────────────────────────────────────

  @Get('admin/pagos/pendientes')
  async getPagosPendientes() {
    const pagos = await this.prisma.empresaevento.findMany({
      where: { estadoVerificacionPago: 'PENDIENTE', estaActivo: 1 },
      orderBy: { fechaHoraEnvioComprobante: 'desc' },
      include: {
        empresa: { include: { ciudad: true } },
        evento: true,
        empresaeventocomprobantes: { where: { estaActivo: 1 } },
      },
    });
    return pagos;
  }

  @Get('admin/pagos/:id')
  async getPagoById(@Param('id') id: string) {
    const pago = await this.prisma.empresaevento.findUnique({
      where: { id: Number(id) },
      include: {
        empresa: { include: { ciudad: true } },
        evento: true,
        empresaeventocomprobantes: { where: { estaActivo: 1 } },
        empresa_usuario: { include: { usuario: true } },
      },
    });
    if (!pago) throw new BadRequestException('Pago no encontrado');
    return pago;
  }

  @Get('admin/pagos')
  async getPagos(
    @Query('estado') estado?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const take = Number(limit) || 15;
    const skip = (Number(page) - 1) * take || 0;
    const where: any = { estaActivo: 1 };
    if (estado) where.estadoVerificacionPago = estado;

    const pagos = await this.prisma.empresaevento.findMany({
      where,
      skip,
      take,
      orderBy: { fechaCreacion: 'desc' },
      include: {
        empresa: { include: { ciudad: true } },
        evento: true,
        empresaeventocomprobantes: { where: { estaActivo: 1 } },
      },
    });
    const total = await this.prisma.empresaevento.count({ where });
    return { data: pagos, total, page: Number(page) || 1, limit: take };
  }

  @Put('admin/pagos/:id/aprobar')
  async aprobarPago(@Param('id') id: string) {
    const pagoId = Number(id);
    const updated = await this.prisma.empresaevento.update({
      where: { id: pagoId },
      data: {
        estadoVerificacionPago: 'COMPLETADO',
        estadoHabilitacionAcceso: 'HABILITADO',
        fechaHoraVerificacionPago: new Date(),
        observacionSobreComprobante: null,
      },
    });
    return updated;
  }

  @Put('admin/pagos/:id/observar')
  async observarPago(@Param('id') id: string, @Body() body: { observacion: string }) {
    return await this.prisma.empresaevento.update({
      where: { id: Number(id) },
      data: {
        estadoVerificacionPago: 'OBSERVADO',
        estadoHabilitacionAcceso: 'NO_HABILITADO',
        observacionSobreComprobante: body.observacion,
      },
    });
  }

  @Put('admin/pagos/:id/rechazar')
  async rechazarPago(@Param('id') id: string, @Body() body: { motivo: string }) {
    return await this.prisma.empresaevento.update({
      where: { id: Number(id) },
      data: {
        estadoVerificacionPago: 'RECHAZADO',
        estadoHabilitacionAcceso: 'NO_HABILITADO',
        motivoRechazoAcceso: body.motivo,
      },
    });
  }

  // ─── ACTIVIDADES DEL PROGRAMA ────────────────────────────────────────────────

  @Get('admin/actividades')
  async getActividades(@Query('eventoId') eventoId?: string) {
    const eId = eventoId ? Number(eventoId) : await this.getPrincipalEventoId();
    if (!eId) return [];

    return await this.prisma.actividadprograma.findMany({
      where: { evento_id: eId, estaActivo: 1 },
      orderBy: [{ fechaActividad: 'asc' }, { horaInicioActividad: 'asc' }],
    });
  }

  @Post('admin/actividades')
  async createActividad(@Body() body: any) {
    try {
      const eventoId = body.evento_id ? Number(body.evento_id) : await this.getPrincipalEventoId();
      if (!eventoId) throw new BadRequestException('No hay evento principal configurado');

      const parseTime = (t: string) => {
        const [h, m] = t.split(':');
        const d = new Date(1970, 0, 1, Number(h), Number(m), 0);
        return d;
      };

      return await this.prisma.actividadprograma.create({
        data: {
          evento_id: eventoId,
          tipoActividad: body.tipoActividad,
          nombreActividad: body.nombreActividad,
          descripcionActividad: body.descripcionActividad,
          nombreSalaEspacio: body.nombreSalaEspacio,
          capacidadPersonasSala: Number(body.capacidadPersonasSala) || 0,
          fechaActividad: new Date(body.fechaActividad),
          horaInicioActividad: parseTime(body.horaInicioActividad),
          horaFinActividad: parseTime(body.horaFinActividad),
          nombreCompletoPilaExpositor: body.nombreCompletoPilaExpositor || null,
          organizacionDelExpositor: body.organizacionDelExpositor || null,
          urlImagenBannerActividad: body.urlImagenBannerActividad || null,
          estadoActividad: body.estadoActividad || 'Activo',
          estaActivo: 1,
        },
      });
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Error al crear actividad');
    }
  }

  @Put('admin/actividades/:id')
  async updateActividad(@Param('id') id: string, @Body() body: any) {
    try {
      const parseTime = (t: string) => {
        const [h, m] = t.split(':');
        return new Date(1970, 0, 1, Number(h), Number(m), 0);
      };

      return await this.prisma.actividadprograma.update({
        where: { id: Number(id) },
        data: {
          tipoActividad: body.tipoActividad,
          nombreActividad: body.nombreActividad,
          descripcionActividad: body.descripcionActividad,
          nombreSalaEspacio: body.nombreSalaEspacio,
          capacidadPersonasSala: Number(body.capacidadPersonasSala) || 0,
          fechaActividad: new Date(body.fechaActividad),
          horaInicioActividad: parseTime(body.horaInicioActividad),
          horaFinActividad: parseTime(body.horaFinActividad),
          nombreCompletoPilaExpositor: body.nombreCompletoPilaExpositor || null,
          organizacionDelExpositor: body.organizacionDelExpositor || null,
          urlImagenBannerActividad: body.urlImagenBannerActividad || null,
          estadoActividad: body.estadoActividad,
          creadoModificadoFecha: new Date(),
        },
      });
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Error al actualizar actividad');
    }
  }

  @Delete('admin/actividades/:id')
  async deleteActividad(@Param('id') id: string) {
    return await this.prisma.actividadprograma.update({
      where: { id: Number(id) },
      data: { estaActivo: 0 },
    });
  }

  // ─── NOTICIAS / COMUNICADOS ──────────────────────────────────────────────────

  @Get('admin/noticias')
  async getNoticias(@Query('eventoId') eventoId?: string) {
    const eId = eventoId ? Number(eventoId) : await this.getPrincipalEventoId();
    if (!eId) return [];

    return await this.prisma.noticia.findMany({
      where: { evento_id: eId, estaActivo: 1 },
      orderBy: { fechaCreacion: 'desc' },
      include: { usuario: { select: { id: true, nombres: true, apellidoPaterno: true } } },
    });
  }

  @Post('admin/noticias')
  async createNoticia(@Body() body: any) {
    try {
      const eventoId = body.evento_id ? Number(body.evento_id) : await this.getPrincipalEventoId();
      if (!eventoId) throw new BadRequestException('No hay evento principal configurado');

      return await this.prisma.noticia.create({
        data: {
          evento_id: eventoId,
          usuario_id: Number(body.usuario_id) || 1,
          tituloNoticia: body.tituloNoticia,
          contenidoNoticia: body.contenidoNoticia,
          urlImagenNoticia: body.urlImagenNoticia || null,
          tipoNoticia: body.tipoNoticia || 'COMUNICADO',
          estadoPublicacion: body.estadoPublicacion || 'PUBLICADO',
          fechaHoraPublicacion: new Date(),
          estaActivo: 1,
        },
      });
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Error al crear noticia');
    }
  }

  @Put('admin/noticias/:id')
  async updateNoticia(@Param('id') id: string, @Body() body: any) {
    try {
      return await this.prisma.noticia.update({
        where: { id: Number(id) },
        data: {
          tituloNoticia: body.tituloNoticia,
          contenidoNoticia: body.contenidoNoticia,
          urlImagenNoticia: body.urlImagenNoticia || null,
          tipoNoticia: body.tipoNoticia,
          estadoPublicacion: body.estadoPublicacion,
          creadoModificadoFecha: new Date(),
        },
      });
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Error al actualizar noticia');
    }
  }

  @Delete('admin/noticias/:id')
  async deleteNoticia(@Param('id') id: string) {
    return await this.prisma.noticia.update({
      where: { id: Number(id) },
      data: { estaActivo: 0 },
    });
  }

  // ─── MESAS ───────────────────────────────────────────────────────────────────

  @Get('admin/mesas/agenda')
  async getMesasAgenda() {
    const eventoId = await this.getPrincipalEventoId();
    if (!eventoId) return [];

    const mesas = await this.prisma.mesa.findMany({
      where: { evento_id: eventoId, estaActivo: 1 },
      orderBy: { numeroMesa: 'asc' },
      include: {
        reunion: {
          where: { estaActivo: 1 },
          orderBy: { fechaHoraInicioReunion: 'asc' },
        },
        mesabloque: {
          where: { estaActivo: 1 },
          orderBy: { fechaHoraInicio: 'asc' },
        },
      },
    });
    return mesas;
  }

  @Get('admin/mesas')
  async getMesas() {
    const eventoId = await this.getPrincipalEventoId();
    if (!eventoId) return [];

    return await this.prisma.mesa.findMany({
      where: { evento_id: eventoId },
      orderBy: { numeroMesa: 'asc' },
      include: {
        _count: { select: { reunion: true } },
      },
    });
  }

  @Post('admin/mesas/generar')
  async generarMesas(@Body() body: { cantidad: number; capacidadPersonas?: number }) {
    const eventoId = await this.getPrincipalEventoId();
    if (!eventoId) throw new BadRequestException('No hay evento principal configurado');

    const existentes = await this.prisma.mesa.findMany({
      where: { evento_id: eventoId },
      orderBy: { numeroMesa: 'desc' },
      take: 1,
    });

    const ultimoNumero = existentes[0]?.numeroMesa ?? 0;
    const capacidad = body.capacidadPersonas || 4;

    const data = Array.from({ length: body.cantidad }, (_, i) => ({
      evento_id: eventoId,
      numeroMesa: ultimoNumero + i + 1,
      capacidadPersonas: capacidad,
      estaActivo: 1,
    }));

    await this.prisma.mesa.createMany({ data });
    return { creadas: body.cantidad, mensaje: `${body.cantidad} mesas generadas correctamente` };
  }

  @Put('admin/mesas/:id')
  async updateMesa(@Param('id') id: string, @Body() body: any) {
    return await this.prisma.mesa.update({
      where: { id: Number(id) },
      data: {
        estaActivo: body.estaActivo !== undefined ? Number(body.estaActivo) : undefined,
        capacidadPersonas: body.capacidadPersonas ? Number(body.capacidadPersonas) : undefined,
        creadoModificadoFecha: new Date(),
      },
    });
  }

  @Delete('admin/mesas/:id')
  async deleteMesa(@Param('id') id: string) {
    return await this.prisma.mesa.update({
      where: { id: Number(id) },
      data: { estaActivo: 0 },
    });
  }

  // ─── TÉCNICOS ────────────────────────────────────────────────────────────────

  @Get('admin/tecnicos')
  async getTecnicos() {
    const eventoId = await this.getPrincipalEventoId();
    return await this.prisma.usuario.findMany({
      where: { rolEvento: 'TECNICO', estaActivo: 1, evento_id: eventoId ?? undefined },
      orderBy: { fechaCreacion: 'desc' },
      select: {
        id: true,
        evento_id: true,
        nombres: true,
        apellidoPaterno: true,
        apellidoMaterno: true,
        correo: true,
        telefono: true,
        urlFotoPerfil: true,
        rolEvento: true,
        estaActivo: true,
        fechaCreacion: true,
        evento: { select: { id: true, nombre: true, edicion: true } },
      },
    });
  }

  @Post('admin/tecnicos')
  async createTecnico(@Body() body: any) {
    try {
      const existing = await this.prisma.usuario.findFirst({ where: { correo: body.correo } });
      if (existing) throw new BadRequestException('Ya existe un usuario con ese correo');

      const eventoId = await this.getPrincipalEventoId();
      if (!eventoId) throw new BadRequestException('No hay un evento principal activo');

      const hashed = await bcrypt.hash(body.contrasenia, 10);
      return await this.prisma.usuario.create({
        data: {
          nombres: body.nombres,
          apellidoPaterno: body.apellidoPaterno,
          apellidoMaterno: body.apellidoMaterno || null,
          correo: body.correo,
          contrasenia: hashed,
          telefono: body.telefono,
          urlFotoPerfil: body.urlFotoPerfil || '',
          rolEvento: 'TECNICO',
          evento_id: eventoId,
          estaActivo: 1,
        },
        select: {
          id: true, evento_id: true, nombres: true, apellidoPaterno: true, apellidoMaterno: true,
          correo: true, telefono: true, urlFotoPerfil: true, rolEvento: true,
          evento: { select: { id: true, nombre: true, edicion: true } },
        },
      });
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Error al crear técnico');
    }
  }

  @Put('admin/tecnicos/:id')
  async updateTecnico(@Param('id') id: string, @Body() body: any) {
    try {
      const data: any = {
        nombres: body.nombres,
        apellidoPaterno: body.apellidoPaterno,
        apellidoMaterno: body.apellidoMaterno || null,
        telefono: body.telefono,
        urlFotoPerfil: body.urlFotoPerfil || undefined,
        creadoModificadoFecha: new Date(),
      };

      if (body.contrasenia) {
        data.contrasenia = await bcrypt.hash(body.contrasenia, 10);
      }

      return await this.prisma.usuario.update({
        where: { id: Number(id) },
        data,
        select: {
          id: true, evento_id: true, nombres: true, apellidoPaterno: true, apellidoMaterno: true,
          correo: true, telefono: true, urlFotoPerfil: true, rolEvento: true,
          evento: { select: { id: true, nombre: true, edicion: true } },
        },
      });
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Error al actualizar técnico');
    }
  }

  @Delete('admin/tecnicos/:id')
  async deleteTecnico(@Param('id') id: string) {
    return await this.prisma.usuario.update({
      where: { id: Number(id) },
      data: { estaActivo: 0 },
    });
  }

  // ─── PERFIL DE USUARIO ───────────────────────────────────────────────────────

  @Get('admin/perfil/:id')
  async getPerfil(@Param('id') id: string) {
    const user = await this.prisma.usuario.findUnique({
      where: { id: Number(id) },
      select: {
        id: true, nombres: true, apellidoPaterno: true, apellidoMaterno: true,
        correo: true, telefono: true, urlFotoPerfil: true, rolEvento: true,
      },
    });
    if (!user) throw new BadRequestException('Usuario no encontrado');
    return user;
  }

  @Put('admin/perfil/:id')
  async updatePerfil(@Param('id') id: string, @Body() body: any) {
    try {
      const data: any = {
        nombres: body.nombres,
        apellidoPaterno: body.apellidoPaterno,
        apellidoMaterno: body.apellidoMaterno || null,
        telefono: body.telefono,
        urlFotoPerfil: body.urlFotoPerfil || undefined,
        creadoModificadoFecha: new Date(),
      };

      if (body.nuevaContrasenia) {
        const user = await this.prisma.usuario.findUnique({ where: { id: Number(id) } });
        if (!user) throw new BadRequestException('Usuario no encontrado');
        const valid = await bcrypt.compare(body.contraseniaActual, user.contrasenia);
        if (!valid) throw new BadRequestException('Contraseña actual incorrecta');
        data.contrasenia = await bcrypt.hash(body.nuevaContrasenia, 10);
      }

      return await this.prisma.usuario.update({
        where: { id: Number(id) },
        data,
        select: {
          id: true, nombres: true, apellidoPaterno: true, apellidoMaterno: true,
          correo: true, telefono: true, urlFotoPerfil: true, rolEvento: true,
        },
      });
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Error al actualizar perfil');
    }
  }

  // ─── ESTADÍSTICAS ────────────────────────────────────────────────────────────

  @Get('admin/estadisticas')
  async getEstadisticas() {
    const eventoId = await this.getPrincipalEventoId();

    const [
      empresasTotal,
      participantesTotal,
      reunionesProgramadas,
      reunionesFinalizadas,
      reunionesEnCurso,
      pagosVerificados,
      pagosPendientes,
      pagosObservados,
      mesasActivas,
      mesasInhabilitadas,
      eventosInternos,
    ] = await Promise.all([
      this.prisma.empresa.count({ where: { estaActivo: 1 } }),
      this.prisma.empresa_usuario.count(),
      this.prisma.reunion.count({ where: { estaActivo: 1, estadoReunion: 'PROGRAMADA' } }),
      this.prisma.reunion.count({ where: { estaActivo: 1, estadoReunion: 'FINALIZADA' } }),
      this.prisma.reunion.count({ where: { estaActivo: 1, estadoReunion: 'EN_CURSO' } }),
      this.prisma.empresaevento.count({ where: { estadoVerificacionPago: 'COMPLETADO', estaActivo: 1 } }),
      this.prisma.empresaevento.count({ where: { estadoVerificacionPago: 'PENDIENTE', estaActivo: 1 } }),
      this.prisma.empresaevento.count({ where: { estadoVerificacionPago: 'OBSERVADO', estaActivo: 1 } }),
      eventoId ? this.prisma.mesa.count({ where: { evento_id: eventoId, estaActivo: 1 } }) : Promise.resolve(0),
      eventoId ? this.prisma.mesa.count({ where: { evento_id: eventoId, estaActivo: 0 } }) : Promise.resolve(0),
      eventoId ? this.prisma.actividadprograma.count({ where: { evento_id: eventoId, estaActivo: 1 } }) : Promise.resolve(0),
    ]);

    const reunionesTotal = reunionesProgramadas + reunionesFinalizadas + reunionesEnCurso;
    const pagosTotal = pagosVerificados + pagosPendientes + pagosObservados;

    const mesas = eventoId
      ? await this.prisma.mesa.findMany({
          where: { evento_id: eventoId },
          orderBy: { numeroMesa: 'asc' },
          select: { id: true, numeroMesa: true, estaActivo: true },
        })
      : [];

    // Empresas por rubro (top 5)
    const empresasPorRubroRaw = await this.prisma.empresa.groupBy({
      by: ['rubro'],
      where: { estaActivo: 1 },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    return {
      kpis: {
        empresasRegistradas: empresasTotal,
        participantesTotales: participantesTotal,
        reunionesProgramadas: reunionesTotal,
        reunionesRealizadas: reunionesFinalizadas,
        pagosVerificados,
        pagosPendientes,
        mesasHabilitadas: mesasActivas,
        eventosInternos,
      },
      reunionesPorEstado: {
        programadas: reunionesProgramadas,
        enCurso: reunionesEnCurso,
        finalizadas: reunionesFinalizadas,
        total: reunionesTotal,
      },
      pagosPorEstado: {
        verificados: pagosVerificados,
        pendientes: pagosPendientes,
        observados: pagosObservados,
        total: pagosTotal,
        porcentajeVerificados: pagosTotal > 0 ? Math.round((pagosVerificados / pagosTotal) * 100) : 0,
        porcentajePendientes: pagosTotal > 0 ? Math.round((pagosPendientes / pagosTotal) * 100) : 0,
        porcentajeObservados: pagosTotal > 0 ? Math.round((pagosObservados / pagosTotal) * 100) : 0,
      },
      mesas: mesas.map((m) => ({ id: m.id, numero: m.numeroMesa, activa: m.estaActivo === 1 })),
      mesasActivas,
      mesasInhabilitadas,
      empresasPorRubro: empresasPorRubroRaw.map((r) => ({ rubro: r.rubro, count: r._count.id })),
    };
  }
}
