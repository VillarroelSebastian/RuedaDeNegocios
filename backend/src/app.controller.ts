import { Controller, Get, Post, Put, Delete, Body, Param, UnauthorizedException, BadRequestException, Query, OnModuleInit } from '@nestjs/common';
import { AppService } from './app.service.js';
import { PrismaService } from './prisma/prisma.service.js';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';

function createMailTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
  });
}

function generarCodigo(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generarPasswordTemporal(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pwd = '';
  for (let i = 0; i < 10; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  return pwd;
}

@Controller()
export class AppController implements OnModuleInit {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    await this.prisma.empresaevento.updateMany({
      where: { estadoVerificacionPago: 'APROBADO' },
      data: { estaActivo: 0 },
    });
    await this.cleanAndSeedMesas();
  }

  private async cleanAndSeedMesas() {
    const eventoId = await this.getPrincipalEventoId();
    if (!eventoId) return;

    // ── Limpiar relaciones de mesas en orden de FK ──
    const mesaIds = (await this.prisma.mesa.findMany({ where: { evento_id: eventoId }, select: { id: true } })).map((m) => m.id);
    const reunionIds = (await this.prisma.reunion.findMany({ where: { evento_id: eventoId }, select: { id: true } })).map((r) => r.id);

    if (reunionIds.length > 0) {
      await this.prisma.resultadoreunion.deleteMany({ where: { reunion_id: { in: reunionIds } } });
    }
    if (mesaIds.length > 0) {
      await this.prisma.mesabloque.deleteMany({ where: { mesa_id: { in: mesaIds } } });
    }
    await this.prisma.reunion.deleteMany({ where: { evento_id: eventoId } });

    // Obtener IDs de empresaevento para limpiar solicitudes
    const eeIds = (await this.prisma.empresaevento.findMany({ where: { evento_id: eventoId }, select: { id: true } })).map((e) => e.id);
    if (eeIds.length > 0) {
      await this.prisma.solicitudreunion.deleteMany({
        where: { OR: [{ empresaEvento_id: { in: eeIds } }, { empresaEventorReceptora_id: { in: eeIds } }] },
      });
    }
    await this.prisma.mesa.deleteMany({ where: { evento_id: eventoId } });

    // ── Recrear mesas limpias según cantidadTotalMesasEvento ──
    const evento = await this.prisma.evento.findUnique({
      where: { id: eventoId },
      select: { cantidadTotalMesasEvento: true, capacidadPersonasPorMesa: true },
    });
    const total = evento?.cantidadTotalMesasEvento ?? 0;
    if (total > 0) {
      await this.prisma.mesa.createMany({
        data: Array.from({ length: total }, (_, i) => ({
          evento_id: eventoId,
          numeroMesa: i + 1,
          capacidadPersonas: evento?.capacidadPersonasPorMesa ?? 4,
          estaActivo: 1,
          estaHabilitada: 1,
        })),
      });
    }

    // ── Seed de reuniones de prueba ──
    const ees = await this.prisma.empresaevento.findMany({
      where: { evento_id: eventoId, estaActivo: 1 },
      include: { empresa_usuario: { take: 1, select: { id: true } } },
      take: 4,
    });
    if (ees.length < 2) return;
    const euId = ees.find((e) => e.empresa_usuario.length > 0)?.empresa_usuario[0]?.id;
    if (!euId) return;

    const mesas = await this.prisma.mesa.findMany({
      where: { evento_id: eventoId, estaActivo: 1 },
      orderBy: { numeroMesa: 'asc' },
      take: 5,
    });
    if (mesas.length === 0) return;

    const now = new Date();
    const a = 0, b = 1;
    const scenarios = [
      { mesaIdx: 0, eaIdx: a, ebIdx: b, offStart: -10,  offEnd:  20,  estado: 'EN_CURSO',   tipo: 'VIRTUAL',    enlace: 'https://zoom.us/j/simulado123'   },
      { mesaIdx: 1, eaIdx: b, ebIdx: a, offStart:  45,  offEnd:  75,  estado: 'PROGRAMADA', tipo: 'PRESENCIAL', enlace: null                              },
      { mesaIdx: 2, eaIdx: a, ebIdx: b, offStart: -90,  offEnd: -60,  estado: 'FINALIZADA', tipo: 'MIXTA',      enlace: 'https://meet.google.com/sim-abc' },
      { mesaIdx: 3, eaIdx: b, ebIdx: a, offStart: -210, offEnd: -180, estado: 'FINALIZADA', tipo: 'PRESENCIAL', enlace: null                              },
    ].filter((s) => s.mesaIdx < mesas.length);

    const observaciones = [
      'Acordamos colaboración estratégica para distribución en el mercado nacional.',
      'Intercambio de información. Se programará una segunda reunión.',
    ];

    for (const [i, s] of scenarios.entries()) {
      const inicio = new Date(now.getTime() + s.offStart * 60000);
      const fin    = new Date(now.getTime() + s.offEnd   * 60000);

      const sol = await this.prisma.solicitudreunion.create({
        data: {
          empresaEvento_id: ees[s.eaIdx].id,
          empresaEventorReceptora_id: ees[s.ebIdx].id,
          empresa_usuarioResponsableSolicitud: euId,
          tipoReunion: s.tipo,
          enlaceReunionVirtual: s.enlace,
          fechaHoraInicioPropuesta: inicio,
          fechaHoraFinPropuesta: fin,
          estadoSolicitud: 'APROBADA',
          estaActivo: 1,
        },
      });

      const reunion = await this.prisma.reunion.create({
        data: {
          solicitudReunion_id: sol.id,
          mesa_id: mesas[s.mesaIdx].id,
          evento_id: eventoId,
          tipoReunion: s.tipo,
          fechaHoraInicioReunion: inicio,
          fechaHoraFinReunion: fin,
          estadoReunion: s.estado,
          seEnvioNotificacionDeRetraso: 0,
          cantidadAsistentesRegistrados: s.estado === 'FINALIZADA' ? 3 : 0,
          estaActivo: 1,
        },
      });

      if (s.estado === 'FINALIZADA') {
        const rangos = ['$1,000 – $10,000', '$10,000 – $50,000', 'Más de $50,000', 'Sin acuerdo comercial'];
        const califs = [5, 4, 3, 4];
        const obsA = [
          'Acordamos colaboración estratégica para distribución en el mercado nacional.',
          'Intercambio de información. Se programará una segunda reunión.',
        ];
        const obsB = [
          'Muy buena reunión, esperamos formalizar el acuerdo próximamente.',
          'Estamos evaluando la propuesta internamente. Prometemos respuesta en 48h.',
        ];
        // Resultado del encargado de empresa A
        await this.prisma.resultadoreunion.create({
          data: {
            reunion_id: reunion.id,
            empresaeventoCalificadora_id: ees[s.eaIdx].id,
            empresaeventoCalificada_id: ees[s.ebIdx].id,
            empresa_usuario_id: euId,
            calificacionReunion: califs[i % 4],
            rangoAcuerdoComercial: rangos[i % 4],
            observacionesPuntosTratados: obsA[i % 2],
            estaActivo: 1,
          },
        });
        // Resultado del encargado de empresa B (solo en la primera reunión finalizada para demo)
        if (i === 2) {
          await this.prisma.resultadoreunion.create({
            data: {
              reunion_id: reunion.id,
              empresaeventoCalificadora_id: ees[s.ebIdx].id,
              empresaeventoCalificada_id: ees[s.eaIdx].id,
              empresa_usuario_id: euId,
              calificacionReunion: 4,
              rangoAcuerdoComercial: '$1,000 – $10,000',
              observacionesPuntosTratados: obsB[0],
              estaActivo: 1,
            },
          });
        }
      }
    }
  }

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
      include: {
        eventoreglaqr: { where: { estadoActivo: 1 }, orderBy: { rangoDesde: 'asc' } },
      },
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

  @Get('public/ciudades')
  async getCiudadesPublic() {
    return this.prisma.ciudad.findMany({
      include: { pais: true },
      orderBy: { nombre: 'asc' },
    });
  }

  @Post('public/registro')
  async registroPublico(@Body() body: any) {
    const eventoId = await this.getPrincipalEventoId();
    if (!eventoId) throw new BadRequestException('No hay evento activo en este momento.');

    const evento = await this.prisma.evento.findUnique({ where: { id: eventoId } });
    if (!evento) throw new BadRequestException('Evento no encontrado.');

    // Verificar duplicado por correo corporativo
    const empresaExistente = await this.prisma.empresa.findFirst({
      where: { correoCorporativo: body.empresa.correoCorporativo, estaActivo: 1 },
    });
    if (empresaExistente) {
      const eeExistente = await this.prisma.empresaevento.findFirst({
        where: { empresa_id: empresaExistente.id, evento_id: eventoId, estaActivo: 1 },
      });
      if (eeExistente) throw new BadRequestException('Esta empresa ya está registrada para el evento actual.');
    }

    // Calcular monto
    const numParticipantes = Number(body.participacion?.numeroParticipantes) || 1;
    const numExtra = Math.max(0, numParticipantes - evento.cantidadParticipantesIncluidos);
    const monto = Number(evento.montoBaseIncripcionBolivianos) + numExtra * evento.costoParticipanteExtra;

    // Resolve pais / ciudad from names (frontend sends paisNombre + ciudadNombre)
    const paisNombre = (body.empresa.paisNombre || 'Bolivia').trim();
    const ciudadNombre = (body.empresa.ciudadNombre || 'Trinidad').trim();
    let paisRec = await this.prisma.pais.findFirst({ where: { nombre: paisNombre } });
    if (!paisRec) paisRec = await this.prisma.pais.create({ data: { nombre: paisNombre } });
    let ciudadRec = await this.prisma.ciudad.findFirst({ where: { nombre: ciudadNombre, pais_id: paisRec.id } });
    if (!ciudadRec) ciudadRec = await this.prisma.ciudad.create({ data: { nombre: ciudadNombre, pais_id: paisRec.id } });

    // Crear o reusar empresa
    const empresa = empresaExistente ?? await this.prisma.empresa.create({
      data: {
        ciudad_id: ciudadRec.id,
        nombre: body.empresa.nombre,
        rubro: body.empresa.rubro,
        sitioWeb: body.empresa.sitioWeb || null,
        descripcion: body.empresa.descripcion || null,
        telefonoWhatsapp: body.empresa.telefonoWhatsapp,
        correoCorporativo: body.empresa.correoCorporativo,
        urlFotoPerfil: '',
        estaActivo: 1,
      },
    });

    // Crear empresaevento
    const ee = await this.prisma.empresaevento.create({
      data: {
        empresa_id: empresa.id,
        evento_id: eventoId,
        tipoParticipacion: body.participacion?.tipoParticipacion || 'PRESENCIAL',
        estadoHabilitacionAcceso: 'NO_HABILITADO',
        montoPagado: monto,
        estadoVerificacionPago: 'PENDIENTE',
        fechaHoraEnvioComprobante: new Date(),
        numeroParticipantes: numParticipantes,
        estaActivo: 1,
      },
    });

    // Crear comprobante si existe URL
    if (body.comprobante?.urlComprobante) {
      await this.prisma.empresaeventocomprobantes.create({
        data: {
          empresaEvento_id: ee.id,
          urlComprobantePagoInscripcion: body.comprobante.urlComprobante,
          estaActivo: 1,
        },
      });
    }

    // Crear participantes (usuario + empresa_usuario)
    const defaultPass = await bcrypt.hash('Beni2026!', 10);
    const participantesCreados: any[] = [];

    for (const p of (body.participantes || [])) {
      const partes = (p.nombreCompleto || '').trim().split(/\s+/);
      const nombres = partes.slice(0, 2).join(' ') || 'Sin nombre';
      const apellidoPaterno = partes[2] || partes[0] || 'Participante';
      const apellidoMaterno = partes.length > 3 ? partes.slice(3).join(' ') : null;

      const usuario = await this.prisma.usuario.create({
        data: {
          nombres,
          apellidoPaterno,
          apellidoMaterno,
          correo: p.correo,
          contrasenia: defaultPass,
          telefono: p.telefono || '',
          urlFotoPerfil: '',
          rolEvento: 'EMPRESA',
          estaActivo: 1,
        },
      });

      await this.prisma.empresa_usuario.create({
        data: {
          empresa_id: empresa.id,
          usuario_id: usuario.id,
          empresaevento_id: ee.id,
          cargo: p.cargo || '',
          esResponsable: p.esResponsable ? 1 : 0,
        },
      });

      participantesCreados.push({
        id: usuario.id,
        nombres: usuario.nombres,
        apellidoPaterno: usuario.apellidoPaterno,
        correo: usuario.correo,
        cargo: p.cargo,
        esResponsable: p.esResponsable,
      });
    }

    return {
      empresa: { id: empresa.id, nombre: empresa.nombre, rubro: empresa.rubro },
      empresaevento: {
        id: ee.id,
        numeroParticipantes: ee.numeroParticipantes,
        montoPagado: ee.montoPagado,
        estadoVerificacionPago: ee.estadoVerificacionPago,
        tipoParticipacion: ee.tipoParticipacion,
      },
      participantes: participantesCreados,
      totalPagado: monto,
    };
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
      ciudadEvento: orNull(body.ciudadEvento),
      paisEvento: orNull(body.paisEvento),
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

  @Get('admin/empresas/:id/participantes')
  async getEmpresaParticipantes(@Param('id') id: string) {
    const eventoId = await this.getPrincipalEventoId();
    const registros = await this.prisma.empresa_usuario.findMany({
      where: {
        empresa_id: Number(id),
        ...(eventoId ? { empresaevento: { evento_id: eventoId, estaActivo: 1 } } : {}),
      },
      include: { usuario: true },
    });
    return registros.map((eu) => ({
      id: eu.id,
      usuarioId: eu.usuario_id,
      nombres: eu.usuario.nombres,
      apellidoPaterno: eu.usuario.apellidoPaterno,
      correo: eu.usuario.correo,
      cargo: eu.cargo,
      esResponsable: eu.esResponsable === 1,
      estaActivo: eu.usuario.estaActivo,
    }));
  }

  // ─── PAGOS ───────────────────────────────────────────────────────────────────

  @Get('admin/pagos/pendientes')
  async getPagosPendientes() {
    const eventoId = await this.getPrincipalEventoId();
    const pagos = await this.prisma.empresaevento.findMany({
      where: { ...(eventoId ? { evento_id: eventoId } : {}), estadoVerificacionPago: 'PENDIENTE', estaActivo: 1 },
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
    const eventoId = await this.getPrincipalEventoId();
    const where: any = { estaActivo: 1 };
    if (eventoId) where.evento_id = eventoId;
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

    const ee = await this.prisma.empresaevento.update({
      where: { id: pagoId },
      data: {
        estadoVerificacionPago: 'COMPLETADO',
        estadoHabilitacionAcceso: 'HABILITADO',
        fechaHoraVerificacionPago: new Date(),
        observacionSobreComprobante: null,
      },
      include: {
        evento: true,
        empresa: true,
        empresa_usuario: { include: { usuario: true } },
      },
    });

    // Generar credenciales únicas y enviar correo a cada participante
    const transporter = createMailTransporter();
    for (const eu of (ee as any).empresa_usuario) {
      const u = eu.usuario;
      const pwd = generarPasswordTemporal();
      const hashed = await bcrypt.hash(pwd, 10);
      await this.prisma.usuario.update({
        where: { id: u.id },
        data: { contrasenia: hashed, creadoModificadoFecha: new Date() },
      });

      const esEncargado = eu.esResponsable === 1;
      const rolLabel = esEncargado ? 'Encargado' : 'Usuario';
      const rolDesc = esEncargado
        ? 'Como <strong>Encargado</strong> podrás gestionar reuniones, ver las mesas asignadas, directorio de empresas y mucho más.'
        : 'Como <strong>Usuario</strong> podrás consultar tus reuniones confirmadas, mesas, noticias y actividades del evento.';

      await transporter.sendMail({
        from: process.env.MAIL_FROM,
        to: u.correo,
        subject: `¡Tu acceso ha sido aprobado! — ${(ee as any).evento?.nombreEvento ?? 'Rueda de Negocios'}`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:12px">
            <h2 style="color:#449D3A;margin-bottom:4px">¡Bienvenido/a a la Rueda de Negocios!</h2>
            <p style="color:#374151;margin-bottom:20px">
              Hola <strong>${u.nombres} ${u.apellidoPaterno}</strong>, tu registro como parte de
              <strong>${(ee as any).empresa?.nombre ?? ''}</strong> ha sido <strong style="color:#449D3A">aprobado</strong>.
            </p>
            <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:20px;margin-bottom:20px">
              <p style="color:#6b7280;font-size:13px;margin:0 0 12px;font-weight:600;text-transform:uppercase;letter-spacing:.5px">Tus credenciales de acceso</p>
              <table style="width:100%;border-collapse:collapse">
                <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;width:110px">Correo</td><td style="padding:6px 0;font-weight:700;color:#111827">${u.correo}</td></tr>
                <tr><td style="padding:6px 0;color:#6b7280;font-size:13px">Contraseña</td><td style="padding:6px 0;font-weight:700;color:#111827;font-size:18px;letter-spacing:2px">${pwd}</td></tr>
                <tr><td style="padding:6px 0;color:#6b7280;font-size:13px">Rol</td><td style="padding:6px 0;font-weight:700;color:#449D3A">${rolLabel}</td></tr>
              </table>
            </div>
            <p style="color:#374151;font-size:14px;margin-bottom:20px">${rolDesc}</p>
            <p style="color:#9ca3af;font-size:12px;margin:0">Por seguridad, te recomendamos cambiar tu contraseña después del primer inicio de sesión.</p>
          </div>
        `,
      });
    }

    return ee;
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
    if (!eventoId) return { mesas: [], eventoConfig: null };

    const [mesas, evento] = await Promise.all([
      this.prisma.mesa.findMany({
        where: { evento_id: eventoId },
        orderBy: { numeroMesa: 'asc' },
        include: {
          reunion: {
            where: { estaActivo: 1 },
            orderBy: { fechaHoraInicioReunion: 'asc' },
            include: {
              solicitudreunion: {
                include: {
                  empresaevento_solicitudreunion_empresaEvento_idToempresaevento: {
                    include: {
                      empresa: { select: { id: true, nombre: true, rubro: true, urlFotoPerfil: true, sitioWeb: true } },
                      empresa_usuario: { select: { usuario: { select: { id: true, nombres: true, apellidoPaterno: true } } } },
                    },
                  },
                  empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento: {
                    include: {
                      empresa: { select: { id: true, nombre: true, rubro: true, urlFotoPerfil: true, sitioWeb: true } },
                      empresa_usuario: { select: { usuario: { select: { id: true, nombres: true, apellidoPaterno: true } } } },
                    },
                  },
                },
              },
              resultadoreunion: {
                where: { estaActivo: 1 },
                select: { id: true, calificacionReunion: true, rangoAcuerdoComercial: true, observacionesPuntosTratados: true },
              },
            },
          },
          mesabloque: {
            where: { estaActivo: 1 },
            orderBy: { fechaHoraInicio: 'asc' },
          },
          _count: { select: { reunion: true } },
        },
      }),
      this.prisma.evento.findUnique({
        where: { id: eventoId },
        select: { duracionReunion: true, tiempoEntreReuniones: true, cantidadTotalMesasEvento: true, capacidadPersonasPorMesa: true },
      }),
    ]);

    const mesasConEstado = mesas.map((m) => ({
      ...m,
      estadoMesa: this.computeEstadoMesa(m.reunion),
    }));

    return { mesas: mesasConEstado, eventoConfig: evento };
  }

  @Get('admin/mesas')
  async getMesas() {
    const eventoId = await this.getPrincipalEventoId();
    if (!eventoId) return { mesas: [], eventoConfig: null };

    const evento = await this.prisma.evento.findUnique({
      where: { id: eventoId },
      select: { duracionReunion: true, tiempoEntreReuniones: true, cantidadTotalMesasEvento: true, capacidadPersonasPorMesa: true },
    });

    // Auto-sync: mesas 1..targetCount → estaActivo=1; mesas >targetCount → estaActivo=0
    const targetCount = evento?.cantidadTotalMesasEvento ?? 0;
    if (targetCount > 0) {
      // Activar mesas en rango que estaban inactivas
      await this.prisma.mesa.updateMany({
        where: { evento_id: eventoId, numeroMesa: { lte: targetCount }, estaActivo: 0 },
        data: { estaActivo: 1 },
      });

      // Desactivar mesas fuera de rango (salvo las que tienen reunión activa)
      const ocupadas = await this.prisma.mesa.findMany({
        where: {
          evento_id: eventoId,
          numeroMesa: { gt: targetCount },
          estaActivo: 1,
          reunion: { some: { estaActivo: 1, estadoReunion: { in: ['EN_CURSO', 'PROGRAMADA'] } } },
        },
        select: { id: true },
      });
      const ocupadasIds = ocupadas.map((m) => m.id);
      const whereOut: any = { evento_id: eventoId, numeroMesa: { gt: targetCount }, estaActivo: 1 };
      if (ocupadasIds.length > 0) whereOut.id = { notIn: ocupadasIds };
      await this.prisma.mesa.updateMany({ where: whereOut, data: { estaActivo: 0 } });

      // Crear mesas faltantes en el rango 1..targetCount
      const existentes = (await this.prisma.mesa.findMany({
        where: { evento_id: eventoId, numeroMesa: { lte: targetCount } },
        select: { numeroMesa: true },
      })).map((m) => m.numeroMesa);
      const faltantes = Array.from({ length: targetCount }, (_, i) => i + 1).filter((n) => !existentes.includes(n));
      if (faltantes.length > 0) {
        await this.prisma.mesa.createMany({
          data: faltantes.map((n) => ({
            evento_id: eventoId,
            numeroMesa: n,
            capacidadPersonas: evento?.capacidadPersonasPorMesa ?? 4,
            estaActivo: 1,
            estaHabilitada: 1,
          })),
        });
      }
    }

    const mesas = await this.prisma.mesa.findMany({
      where: { evento_id: eventoId, estaActivo: 1 },
      orderBy: { numeroMesa: 'asc' },
      include: {
        reunion: {
          where: { estaActivo: 1 },
          orderBy: { fechaHoraInicioReunion: 'asc' },
          include: {
            solicitudreunion: {
              include: {
                empresaevento_solicitudreunion_empresaEvento_idToempresaevento: {
                  include: { empresa: { select: { id: true, nombre: true, rubro: true, urlFotoPerfil: true } } },
                },
                empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento: {
                  include: { empresa: { select: { id: true, nombre: true, rubro: true, urlFotoPerfil: true } } },
                },
              },
            },
          },
        },
      },
    });

    const mesasConEstado = mesas.map((m) => {
      const estadoMesa = this.computeEstadoMesa(m.reunion);
      const reunionActual =
        m.reunion.find((r: any) => r.estadoReunion === 'EN_CURSO') ||
        m.reunion.find((r: any) => r.estadoReunion === 'PROGRAMADA') ||
        null;
      return { ...m, estadoMesa, reunionActual };
    });

    return { mesas: mesasConEstado, eventoConfig: evento };
  }

  @Put('admin/evento/config')
  async updateEventoConfig(@Body() body: { tiempoEntreReuniones?: number; duracionReunion?: number }) {
    const eventoId = await this.getPrincipalEventoId();
    if (!eventoId) throw new BadRequestException('No hay evento principal configurado');
    return await this.prisma.evento.update({
      where: { id: eventoId },
      data: {
        ...(body.tiempoEntreReuniones !== undefined && { tiempoEntreReuniones: Number(body.tiempoEntreReuniones) }),
        ...(body.duracionReunion !== undefined && { duracionReunion: Number(body.duracionReunion) }),
        creadoModificadoFecha: new Date(),
      },
      select: { duracionReunion: true, tiempoEntreReuniones: true, cantidadTotalMesasEvento: true, capacidadPersonasPorMesa: true },
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

  @Get('admin/mesas/historial')
  async getMesasHistorial(@Query('q') q?: string) {
    const eventoId = await this.getPrincipalEventoId();
    if (!eventoId) return [];

    const reuniones = await this.prisma.reunion.findMany({
      where: { evento_id: eventoId, estaActivo: 1, estadoReunion: 'FINALIZADA' },
      orderBy: { fechaHoraFinReunion: 'desc' },
      include: {
        mesa: { select: { id: true, numeroMesa: true } },
        solicitudreunion: {
          include: {
            empresaevento_solicitudreunion_empresaEvento_idToempresaevento: {
              include: { empresa: { select: { id: true, nombre: true, rubro: true, urlFotoPerfil: true } } },
            },
            empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento: {
              include: { empresa: { select: { id: true, nombre: true, rubro: true, urlFotoPerfil: true } } },
            },
          },
        },
        resultadoreunion: {
          where: { estaActivo: 1 },
          select: {
            id: true,
            empresaeventoCalificadora_id: true,
            calificacionReunion: true,
            rangoAcuerdoComercial: true,
            observacionesPuntosTratados: true,
          },
        },
      },
    });

    if (!q || !q.trim()) return reuniones;
    const qLower = q.toLowerCase();
    return reuniones.filter((r) => {
      if (String(r.mesa?.numeroMesa).includes(q)) return true;
      const ea = (r.solicitudreunion as any)?.empresaevento_solicitudreunion_empresaEvento_idToempresaevento?.empresa;
      const eb = (r.solicitudreunion as any)?.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento?.empresa;
      return ea?.nombre?.toLowerCase().includes(qLower) || eb?.nombre?.toLowerCase().includes(qLower);
    });
  }

  @Get('admin/mesas/:id')
  async getMesaById(@Param('id') id: string) {
    const eventoId = await this.getPrincipalEventoId();
    if (!eventoId) throw new BadRequestException('No hay evento principal');
    const [mesa, evento] = await Promise.all([
      this.prisma.mesa.findUnique({
        where: { id: Number(id) },
        include: {
          reunion: {
            where: { estaActivo: 1 },
            orderBy: { fechaHoraInicioReunion: 'asc' },
            include: {
              solicitudreunion: {
                include: {
                  empresaevento_solicitudreunion_empresaEvento_idToempresaevento: {
                    include: { empresa: { select: { id: true, nombre: true, rubro: true, urlFotoPerfil: true } } },
                  },
                  empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento: {
                    include: { empresa: { select: { id: true, nombre: true, rubro: true, urlFotoPerfil: true } } },
                  },
                },
              },
              resultadoreunion: {
                where: { estaActivo: 1 },
                select: { id: true, calificacionReunion: true, rangoAcuerdoComercial: true, observacionesPuntosTratados: true },
              },
            },
          },
        },
      }),
      this.prisma.evento.findUnique({
        where: { id: eventoId },
        select: { tiempoEntreReuniones: true },
      }),
    ]);
    if (!mesa) throw new BadRequestException('Mesa no encontrada');
    return { ...mesa, estadoMesa: this.computeEstadoMesa(mesa.reunion) };
  }

  @Put('admin/mesas/:id/habilitar')
  async toggleHabilitarMesa(@Param('id') id: string, @Body() body: { estaHabilitada: number }) {
    return await this.prisma.mesa.update({
      where: { id: Number(id) },
      data: { estaHabilitada: Number(body.estaHabilitada), creadoModificadoFecha: new Date() },
    });
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

  // ─── REUNIONES (admin) ───────────────────────────────────────────────────────

  @Put('admin/reuniones/:id/estado')
  async updateAdminReunionEstado(@Param('id') id: string, @Body() body: { estadoReunion: string; asistentes?: number }) {
    const data: any = { estadoReunion: body.estadoReunion, creadoModificadoFecha: new Date() };
    if (body.asistentes !== undefined) data.cantidadAsistentesRegistrados = Number(body.asistentes);
    return await this.prisma.reunion.update({ where: { id: Number(id) }, data });
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

    const ef = eventoId ? { evento_id: eventoId } : {};

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
      eventoId ? this.prisma.empresaevento.count({ where: { evento_id: eventoId, estaActivo: 1 } }) : Promise.resolve(0),
      eventoId
        ? this.prisma.empresa_usuario.count({ where: { empresaevento: { evento_id: eventoId, estaActivo: 1 } } })
        : Promise.resolve(0),
      this.prisma.reunion.count({ where: { ...ef, estaActivo: 1, estadoReunion: 'PROGRAMADA' } }),
      this.prisma.reunion.count({ where: { ...ef, estaActivo: 1, estadoReunion: 'FINALIZADA' } }),
      this.prisma.reunion.count({ where: { ...ef, estaActivo: 1, estadoReunion: 'EN_CURSO' } }),
      this.prisma.empresaevento.count({ where: { ...ef, estadoVerificacionPago: 'COMPLETADO', estaActivo: 1 } }),
      this.prisma.empresaevento.count({ where: { ...ef, estadoVerificacionPago: 'PENDIENTE', estaActivo: 1 } }),
      this.prisma.empresaevento.count({ where: { ...ef, estadoVerificacionPago: 'OBSERVADO', estaActivo: 1 } }),
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

    const empresasPorRubroRaw = eventoId
      ? await this.prisma.empresaevento.groupBy({
          by: ['empresa_id'],
          where: { evento_id: eventoId, estaActivo: 1 },
        }).then(async (ees) => {
          const ids = ees.map((e) => e.empresa_id);
          const rubros = await this.prisma.empresa.groupBy({
            by: ['rubro'],
            where: { id: { in: ids }, estaActivo: 1 },
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 5,
          });
          return rubros;
        })
      : [];

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

  // ─── TÉCNICO ─────────────────────────────────────────────────────────────────

  private reunionInclude() {
    return {
      solicitudreunion: {
        include: {
          empresaevento_solicitudreunion_empresaEvento_idToempresaevento: {
            include: {
              empresa: { select: { id: true, nombre: true, rubro: true, urlFotoPerfil: true } },
              empresa_usuario: { take: 1, include: { usuario: { select: { id: true, nombres: true, apellidoPaterno: true, correo: true } } } },
            },
          },
          empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento: {
            include: {
              empresa: { select: { id: true, nombre: true, rubro: true, urlFotoPerfil: true } },
              empresa_usuario: { take: 1, include: { usuario: { select: { id: true, nombres: true, apellidoPaterno: true, correo: true } } } },
            },
          },
        },
      },
      mesa: { select: { id: true, numeroMesa: true, capacidadPersonas: true } },
      resultadoreunion: {
        where: { estaActivo: 1 },
        select: { id: true, empresaeventoCalificadora_id: true, calificacionReunion: true, rangoAcuerdoComercial: true, observacionesPuntosTratados: true },
      },
    };
  }

  private computeEstadoMesa(reuniones: any[]): string {
    const activas = (reuniones ?? []).filter((r: any) => r.estaActivo === 1);
    if (activas.some((r: any) => r.estadoReunion === 'EN_CURSO')) return 'EN_USO';
    if (activas.some((r: any) => r.estadoReunion === 'PROGRAMADA')) return 'RESERVADA';
    return 'LIBRE';
  }

  @Get('tecnico/dashboard')
  async getTecnicoDashboard() {
    const eventoId = await this.getPrincipalEventoId();
    if (!eventoId) return { stats: {}, proximasReuniones: [], evento: null };

    const ahora = new Date();
    const ef = { evento_id: eventoId, estaActivo: 1 };

    const [evento, reunionesEnCurso, proximasReuniones, reunionesVirtuales, mesasActivas, todasReuniones, proximasActividades] =
      await Promise.all([
        this.prisma.evento.findUnique({ where: { id: eventoId }, select: { nombre: true, edicion: true, fechaInicioEvento: true, fechaFinEvento: true } }),
        this.prisma.reunion.count({ where: { ...ef, estadoReunion: 'EN_CURSO' } }),
        this.prisma.reunion.count({ where: { ...ef, estadoReunion: 'PROGRAMADA', fechaHoraInicioReunion: { gte: ahora } } }),
        this.prisma.reunion.count({ where: { ...ef, tipoReunion: { in: ['VIRTUAL', 'MIXTA'] }, estadoReunion: { not: 'CANCELADA' } } }),
        this.prisma.mesa.count({ where: { evento_id: eventoId, estaActivo: 1 } }),
        this.prisma.reunion.findMany({
          where: { ...ef, estadoReunion: { in: ['PROGRAMADA', 'EN_CURSO'] }, fechaHoraInicioReunion: { gte: ahora } },
          orderBy: { fechaHoraInicioReunion: 'asc' },
          take: 8,
          include: this.reunionInclude(),
        }),
        this.prisma.actividadprograma.findMany({
          where: { evento_id: eventoId, estaActivo: 1 },
          orderBy: [{ fechaActividad: 'asc' }, { horaInicioActividad: 'asc' }],
          take: 4,
        }),
      ]);

    return {
      stats: { reunionesEnCurso, proximasReuniones, reunionesVirtuales, mesasActivas },
      proximasReuniones: todasReuniones,
      proximasActividades,
      evento,
    };
  }

  @Get('tecnico/mesas')
  async getTecnicoMesas() {
    const eventoId = await this.getPrincipalEventoId();
    if (!eventoId) return { mesas: [], eventoConfig: null };

    const [mesas, eventoConfig] = await Promise.all([
      this.prisma.mesa.findMany({
        where: { evento_id: eventoId },
        orderBy: { numeroMesa: 'asc' },
        include: {
          reunion: {
            where: { estaActivo: 1 },
            orderBy: { fechaHoraInicioReunion: 'asc' },
            include: this.reunionInclude(),
          },
          _count: { select: { reunion: true } },
        },
      }),
      this.prisma.evento.findUnique({
        where: { id: eventoId },
        select: { duracionReunion: true, tiempoEntreReuniones: true, cantidadTotalMesasEvento: true, capacidadPersonasPorMesa: true },
      }),
    ]);

    const mesasConEstado = mesas.map((m) => ({
      ...m,
      estadoMesa: this.computeEstadoMesa(m.reunion),
    }));

    return { mesas: mesasConEstado, eventoConfig };
  }

  @Get('tecnico/reuniones')
  async getTecnicoReuniones(@Query('q') q?: string, @Query('estado') estado?: string, @Query('tipo') tipo?: string) {
    const eventoId = await this.getPrincipalEventoId();
    if (!eventoId) return [];

    const where: any = { evento_id: eventoId, estaActivo: 1 };
    if (estado && estado !== 'TODOS') where.estadoReunion = estado;
    if (tipo && tipo !== 'TODOS') where.tipoReunion = tipo;

    const reuniones = await this.prisma.reunion.findMany({
      where,
      orderBy: { fechaHoraInicioReunion: 'asc' },
      include: this.reunionInclude(),
    });

    if (q && q.trim()) {
      const lower = q.toLowerCase();
      return reuniones.filter((r) => {
        const sol = r.solicitudreunion as any;
        const ea = sol?.empresaevento_solicitudreunion_empresaEvento_idToempresaevento?.empresa;
        const eb = sol?.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento?.empresa;
        const mesaNum = String((r as any).mesa?.numeroMesa ?? '');
        return (
          ea?.nombre?.toLowerCase().includes(lower) ||
          eb?.nombre?.toLowerCase().includes(lower) ||
          mesaNum.includes(lower) ||
          r.estadoReunion.toLowerCase().includes(lower) ||
          r.tipoReunion.toLowerCase().includes(lower)
        );
      });
    }

    return reuniones;
  }

  @Put('tecnico/reuniones/:id/estado')
  async updateTecnicoReunionEstado(@Param('id') id: string, @Body() body: { estadoReunion: string; observaciones?: string }) {
    return await this.prisma.reunion.update({
      where: { id: Number(id) },
      data: {
        estadoReunion: body.estadoReunion,
        observacionesReunion: body.observaciones ?? undefined,
        creadoModificadoFecha: new Date(),
      },
      include: this.reunionInclude(),
    });
  }

  @Get('tecnico/buscar')
  async tecnicoBuscar(@Query('q') q: string) {
    const eventoId = await this.getPrincipalEventoId();
    if (!eventoId || !q?.trim()) return { empresas: [], reuniones: [], mesas: [] };

    const lower = q.toLowerCase();

    const [empresasRaw, reunionesRaw, mesasRaw] = await Promise.all([
      this.prisma.empresaevento.findMany({
        where: { evento_id: eventoId, estaActivo: 1 },
        include: { empresa: { select: { id: true, nombre: true, rubro: true, ciudad: { select: { nombre: true } }, urlFotoPerfil: true } } },
        take: 20,
      }),
      this.prisma.reunion.findMany({
        where: { evento_id: eventoId, estaActivo: 1 },
        include: this.reunionInclude(),
        take: 50,
      }),
      this.prisma.mesa.findMany({
        where: { evento_id: eventoId },
        orderBy: { numeroMesa: 'asc' },
        take: 50,
      }),
    ]);

    const empresas = empresasRaw
      .filter((ee) => ee.empresa.nombre.toLowerCase().includes(lower) || ee.empresa.rubro.toLowerCase().includes(lower))
      .map((ee) => ({ ...ee.empresa, estadoPago: ee.estadoVerificacionPago }));

    const reuniones = reunionesRaw.filter((r) => {
      const sol = r.solicitudreunion as any;
      const ea = sol?.empresaevento_solicitudreunion_empresaEvento_idToempresaevento?.empresa;
      const eb = sol?.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento?.empresa;
      return (
        ea?.nombre?.toLowerCase().includes(lower) ||
        eb?.nombre?.toLowerCase().includes(lower) ||
        String((r as any).mesa?.numeroMesa).includes(lower)
      );
    });

    const mesas = mesasRaw.filter((m) => String(m.numeroMesa).includes(q.trim()));

    return { empresas, reuniones, mesas };
  }

  @Get('tecnico/reuniones/:id')
  async getTecnicoReunionDetalle(@Param('id') id: string) {
    return await this.prisma.reunion.findUnique({
      where: { id: Number(id) },
      include: {
        ...this.reunionInclude(),
        solicitudreunion: {
          include: {
            empresaevento_solicitudreunion_empresaEvento_idToempresaevento: {
              include: {
                empresa: { select: { id: true, nombre: true, rubro: true, urlFotoPerfil: true, correoCorporativo: true } },
                empresa_usuario: { select: { usuario: { select: { id: true, nombres: true, apellidoPaterno: true } } } },
              },
            },
            empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento: {
              include: {
                empresa: { select: { id: true, nombre: true, rubro: true, urlFotoPerfil: true, correoCorporativo: true } },
                empresa_usuario: { select: { usuario: { select: { id: true, nombres: true, apellidoPaterno: true } } } },
              },
            },
          },
        },
      },
    });
  }

  @Get('tecnico/mesas/historial')
  async getTecnicoMesasHistorial(@Query('q') q?: string) {
    const eventoId = await this.getPrincipalEventoId();
    if (!eventoId) return [];

    const reuniones = await this.prisma.reunion.findMany({
      where: { evento_id: eventoId, estaActivo: 1, estadoReunion: 'FINALIZADA' },
      orderBy: { fechaHoraFinReunion: 'desc' },
      include: {
        mesa: { select: { id: true, numeroMesa: true } },
        solicitudreunion: {
          include: {
            empresaevento_solicitudreunion_empresaEvento_idToempresaevento: {
              include: { empresa: { select: { id: true, nombre: true, rubro: true, urlFotoPerfil: true } } },
            },
            empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento: {
              include: { empresa: { select: { id: true, nombre: true, rubro: true, urlFotoPerfil: true } } },
            },
          },
        },
        resultadoreunion: {
          where: { estaActivo: 1 },
          select: {
            id: true,
            empresaeventoCalificadora_id: true,
            calificacionReunion: true,
            rangoAcuerdoComercial: true,
            observacionesPuntosTratados: true,
          },
        },
      },
    });

    if (!q || !q.trim()) return reuniones;
    const qLower = q.toLowerCase();
    return reuniones.filter((r) => {
      if (String(r.mesa?.numeroMesa).includes(q)) return true;
      const ea = (r.solicitudreunion as any)?.empresaevento_solicitudreunion_empresaEvento_idToempresaevento?.empresa;
      const eb = (r.solicitudreunion as any)?.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento?.empresa;
      return ea?.nombre?.toLowerCase().includes(qLower) || eb?.nombre?.toLowerCase().includes(qLower);
    });
  }

  @Put('tecnico/reuniones/:id/link')
  async updateTecnicoReunionLink(@Param('id') id: string, @Body() body: { enlace: string }) {
    const reunion = await this.prisma.reunion.findUnique({
      where: { id: Number(id) },
      select: { solicitudReunion_id: true },
    });
    if (!reunion?.solicitudReunion_id) throw new BadRequestException('Reunión sin solicitud asociada');
    await this.prisma.solicitudreunion.update({
      where: { id: reunion.solicitudReunion_id },
      data: { enlaceReunionVirtual: body.enlace || null, creadoModificadoFecha: new Date() },
    });
    return { ok: true };
  }

  @Post('tecnico/reuniones/:id/mensaje')
  async sendTecnicoMensaje(@Param('id') id: string, @Body() body: { empresa: string; mensaje: string }) {
    if (!body.mensaje?.trim()) throw new BadRequestException('El mensaje no puede estar vacío');
    const reunion = await this.prisma.reunion.findUnique({
      where: { id: Number(id) },
      include: {
        solicitudreunion: {
          include: {
            empresaevento_solicitudreunion_empresaEvento_idToempresaevento: {
              include: { empresa_usuario: { take: 1, include: { usuario: { select: { nombres: true, correo: true } } } } },
            },
            empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento: {
              include: { empresa_usuario: { take: 1, include: { usuario: { select: { nombres: true, correo: true } } } } },
            },
          },
        },
      },
    });
    const sol = reunion?.solicitudreunion as any;
    const ee = body.empresa === 'A'
      ? sol?.empresaevento_solicitudreunion_empresaEvento_idToempresaevento
      : sol?.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento;
    const usuario = ee?.empresa_usuario?.[0]?.usuario;
    if (!usuario?.correo) throw new BadRequestException('No se encontró el encargado de la empresa');

    const transporter = createMailTransporter();
    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: usuario.correo,
      subject: 'Mensaje del técnico — Rueda de Negocios',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:12px">
          <h2 style="color:#449D3A;margin-bottom:8px">Mensaje del Técnico</h2>
          <p style="color:#374151;margin-bottom:16px">Hola <strong>${usuario.nombres}</strong>, el técnico del evento te ha enviado el siguiente mensaje:</p>
          <div style="background:#fff;border-left:4px solid #449D3A;padding:16px;border-radius:8px;margin-bottom:16px">
            <p style="color:#111827;margin:0;white-space:pre-wrap">${body.mensaje}</p>
          </div>
          <p style="color:#9ca3af;font-size:12px">Este es un mensaje automático del sistema de Rueda de Negocios.</p>
        </div>
      `,
    });
    return { ok: true };
  }

  @Get('tecnico/noticias')
  async getTecnicoNoticias() {
    const eventoId = await this.getPrincipalEventoId();
    if (!eventoId) return [];
    return await this.prisma.noticia.findMany({
      where: { evento_id: eventoId, estaActivo: 1, estadoPublicacion: 'PUBLICADO' },
      orderBy: { fechaCreacion: 'desc' },
      include: { usuario: { select: { id: true, nombres: true, apellidoPaterno: true } } },
    });
  }

  @Get('tecnico/actividades')
  async getTecnicoActividades() {
    const eventoId = await this.getPrincipalEventoId();
    if (!eventoId) return [];
    const ahora = new Date();
    return await this.prisma.actividadprograma.findMany({
      where: { evento_id: eventoId, estaActivo: 1, fechaActividad: { gte: new Date(ahora.toDateString()) } },
      orderBy: [{ fechaActividad: 'asc' }, { horaInicioActividad: 'asc' }],
      take: 6,
    });
  }

  @Put('auth/cambiar-password')
  async cambiarPassword(@Body() body: { usuarioId: number; passwordActual: string; passwordNueva: string }) {
    try {
      const user = await this.prisma.usuario.findUnique({ where: { id: body.usuarioId } });
      if (!user) throw new BadRequestException('Usuario no encontrado');
      const valid = await bcrypt.compare(body.passwordActual, user.contrasenia);
      if (!valid) throw new BadRequestException('Contraseña actual incorrecta');
      const hashed = await bcrypt.hash(body.passwordNueva, 10);
      return await this.prisma.usuario.update({
        where: { id: body.usuarioId },
        data: { contrasenia: hashed, creadoModificadoFecha: new Date() },
        select: { id: true },
      });
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Error al cambiar contraseña');
    }
  }

  // ── Reset de contraseña por email ──────────────────────────────────────────

  @Post('auth/solicitar-reset')
  async solicitarReset(@Body() body: { correo: string }) {
    try {
      const u = await this.prisma.usuario.findFirst({
        where: { correo: body.correo, estaActivo: 1 },
        select: { id: true, nombres: true, correo: true },
      });
      // Siempre respondemos igual para no revelar si el correo existe
      if (!u) return { ok: true };

      const codigo = generarCodigo();
      const hashed = await bcrypt.hash(codigo, 10);
      const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 min

      await this.prisma.usuario.update({
        where: { id: u.id },
        data: { resetToken: hashed, resetTokenExpiry: expiry },
      });

      const transporter = createMailTransporter();
      await transporter.sendMail({
        from: process.env.MAIL_FROM,
        to: u.correo,
        subject: 'Código para restablecer tu contraseña — Rueda de Negocios',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:12px">
            <h2 style="color:#449D3A;margin-bottom:8px">Restablece tu contraseña</h2>
            <p style="color:#374151;margin-bottom:24px">Hola <strong>${u.nombres}</strong>, recibimos una solicitud para cambiar tu contraseña.</p>
            <div style="background:#fff;border:2px solid #449D3A;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
              <p style="color:#6b7280;font-size:13px;margin:0 0 8px">Tu código de verificación es:</p>
              <span style="font-size:36px;font-weight:700;color:#449D3A;letter-spacing:8px">${codigo}</span>
              <p style="color:#9ca3af;font-size:12px;margin:12px 0 0">Válido por <strong>15 minutos</strong></p>
            </div>
            <p style="color:#9ca3af;font-size:12px">Si no solicitaste esto, ignora este correo.</p>
          </div>
        `,
      });

      return { ok: true };
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Error al enviar correo');
    }
  }

  @Post('auth/confirmar-reset')
  async confirmarReset(@Body() body: { correo: string; codigo: string; nuevaContrasenia: string }) {
    try {
      if (!body.correo || !body.codigo || !body.nuevaContrasenia)
        throw new BadRequestException('Todos los campos son requeridos');
      if (body.nuevaContrasenia.length < 6)
        throw new BadRequestException('La contraseña debe tener al menos 6 caracteres');

      const u = await this.prisma.usuario.findFirst({
        where: { correo: body.correo, estaActivo: 1 },
        select: { id: true, resetToken: true, resetTokenExpiry: true },
      });
      if (!u || !u.resetToken) throw new BadRequestException('Código inválido o expirado');

      const expired = !u.resetTokenExpiry || new Date(u.resetTokenExpiry) < new Date();
      if (expired) throw new BadRequestException('El código ha expirado. Solicita uno nuevo');

      const valid = await bcrypt.compare(body.codigo, u.resetToken);
      if (!valid) throw new BadRequestException('Código incorrecto');

      const hashed = await bcrypt.hash(body.nuevaContrasenia, 10);
      await this.prisma.usuario.update({
        where: { id: u.id },
        data: { contrasenia: hashed, resetToken: null, resetTokenExpiry: null, creadoModificadoFecha: new Date() },
      });

      return { ok: true, message: 'Contraseña actualizada correctamente' };
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Error al restablecer contraseña');
    }
  }
}
