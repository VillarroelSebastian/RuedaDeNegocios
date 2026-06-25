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
    await this.ensureMesasExist();
  }

  // Solo crea mesas si el evento principal no tiene ninguna; nunca borra datos reales.
  private async ensureMesasExist() {
    const eventoId = await this.getPrincipalEventoId();
    if (!eventoId) return;

    const mesasExistentes = await this.prisma.mesa.count({ where: { evento_id: eventoId } });
    if (mesasExistentes > 0) return;

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
  }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // ─── AUTH ───────────────────────────────────────────────────────────────────

  @Post('auth/login')
  async login(@Body() body: { correo: string; contrasenia: string }) {
    const correoNorm = (body.correo ?? '').trim().toLowerCase();
    const user = await this.prisma.usuario.findFirst({
      where: { correo: correoNorm, estaActivo: 1 },
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

  @Get('public/verificar-empresa')
  async verificarEmpresa(@Query('correo') correo: string) {
    if (!correo) return { existe: false };
    const eventoId = await this.getPrincipalEventoId();
    if (!eventoId) return { existe: false };
    const empresa = await this.prisma.empresa.findFirst({
      where: { correoCorporativo: correo.trim(), estaActivo: 1 },
    });
    if (!empresa) return { existe: false };
    const ee = await this.prisma.empresaevento.findFirst({
      where: { empresa_id: empresa.id, evento_id: eventoId, estaActivo: 1 },
    });
    return { existe: !!ee, nombreEmpresa: ee ? empresa.nombre : undefined };
  }

  @Get('public/seguimiento')
  async getSeguimiento(@Query('ee') eeId: string) {
    const id = Number(eeId);
    if (!id) throw new BadRequestException('ID inválido');
    const ee: any = await this.prisma.empresaevento.findUnique({
      where: { id },
      include: {
        empresa: { select: { nombre: true, rubro: true, correoCorporativo: true, urlFotoPerfil: true } },
        evento: { select: { nombre: true, urlLogoEvento: true } },
        empresaeventocomprobantes: { where: { estaActivo: 1 }, orderBy: { id: 'desc' }, take: 1 },
        empresa_usuario: {
          include: { usuario: { select: { nombres: true, apellidoPaterno: true, correo: true } } },
        },
      },
    } as any);
    if (!ee) throw new BadRequestException('Registro no encontrado');
    return {
      id: ee.id,
      empresa: ee.empresa,
      evento: { nombre: ee.evento?.nombre, urlLogoEvento: ee.evento?.urlLogoEvento },
      estadoVerificacionPago: ee.estadoVerificacionPago,
      estadoHabilitacionAcceso: ee.estadoHabilitacionAcceso,
      observacionSobreComprobante: ee.observacionSobreComprobante,
      montoPagado: ee.montoPagado,
      tipoParticipacion: ee.tipoParticipacion,
      numeroParticipantes: ee.numeroParticipantes,
      fechaHoraEnvioComprobante: ee.fechaHoraEnvioComprobante,
      urlComprobante: ee.empresaeventocomprobantes?.[0]?.urlComprobantePagoInscripcion ?? null,
      tieneComprobante: ee.empresaeventocomprobantes?.length > 0,
      encargado: ee.empresa_usuario?.find((eu: any) => eu.esResponsable === 1)?.usuario ?? null,
    };
  }

  @Post('public/seguimiento/:id/comprobante')
  async resubirComprobante(@Param('id') id: string, @Body() body: { urlComprobante: string }) {
    const eeId = Number(id);
    if (!eeId || !body.urlComprobante) throw new BadRequestException('Datos inválidos');

    const ee = await this.prisma.empresaevento.findUnique({ where: { id: eeId } });
    if (!ee) throw new BadRequestException('Registro no encontrado');
    if (ee.estadoVerificacionPago === 'COMPLETADO' || ee.estadoVerificacionPago === 'RECHAZADO') {
      throw new BadRequestException('No se puede modificar el comprobante en el estado actual');
    }

    // Desactivar comprobantes anteriores
    await this.prisma.empresaeventocomprobantes.updateMany({
      where: { empresaEvento_id: eeId, estaActivo: 1 },
      data: { estaActivo: 0 },
    });

    // Crear nuevo comprobante
    await this.prisma.empresaeventocomprobantes.create({
      data: { empresaEvento_id: eeId, urlComprobantePagoInscripcion: body.urlComprobante, estaActivo: 1 },
    });

    // Volver a PENDIENTE — se mantiene la observación para que el encargado y el admin la vean
    await this.prisma.empresaevento.update({
      where: { id: eeId },
      data: {
        estadoVerificacionPago: 'PENDIENTE',
        fechaHoraEnvioComprobante: new Date(),
      },
    });

    return { ok: true };
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
    const participantesOmitidos: any[] = [];
    const correosVistos = new Set<string>();

    for (const p of (body.participantes || [])) {
      // Soporte para campos separados (nuevo) o nombre completo (legacy)
      let nombres: string, apellidoPaterno: string, apellidoMaterno: string | null;
      if (p.nombres) {
        nombres = p.nombres.trim() || 'Sin nombre';
        apellidoPaterno = (p.apellidoPaterno || '').trim() || 'Participante';
        apellidoMaterno = p.apellidoMaterno?.trim() || null;
      } else {
        const partes = (p.nombreCompleto || '').trim().split(/\s+/);
        nombres = partes.slice(0, 2).join(' ') || 'Sin nombre';
        apellidoPaterno = partes[2] || partes[0] || 'Participante';
        apellidoMaterno = partes.length > 3 ? partes.slice(3).join(' ') : null;
      }

      // Normalizar email
      const correoNorm = (p.correo ?? '').trim().toLowerCase();
      if (!correoNorm) continue;

      // Deduplicar dentro de la misma inscripción
      if (correosVistos.has(correoNorm)) {
        participantesOmitidos.push({ correo: correoNorm, motivo: 'Email duplicado en la misma inscripción' });
        continue;
      }
      correosVistos.add(correoNorm);

      // Verificar si el email ya existe en la base de datos
      const existente = await this.prisma.usuario.findFirst({
        where: { correo: correoNorm, estaActivo: 1 },
        select: { id: true, rolEvento: true, empresa_usuario: { select: { empresa_id: true } } },
      });

      if (existente) {
        const rol = existente.rolEvento;
        if (rol === 'ADMINISTRADOR' || rol === 'TECNICO') {
          console.warn(`[REGISTRO] Email ${correoNorm} pertenece a un usuario interno (${rol}). Se omite.`);
          participantesOmitidos.push({ correo: correoNorm, motivo: `Email ya en uso por rol interno (${rol})` });
          continue;
        }
        if (rol === 'EMPRESA') {
          const mismaEmpresa = existente.empresa_usuario?.some((eu: any) => eu.empresa_id === empresa.id);
          if (mismaEmpresa) {
            console.warn(`[REGISTRO] Email ${correoNorm} ya está vinculado a esta empresa. Se omite.`);
            participantesOmitidos.push({ correo: correoNorm, motivo: 'Email ya registrado para esta empresa' });
          } else {
            console.warn(`[REGISTRO] Email ${correoNorm} ya pertenece a otra empresa. Se omite.`);
            participantesOmitidos.push({ correo: correoNorm, motivo: 'Email ya en uso por otra empresa' });
          }
          continue;
        }
      }

      const usuario = await this.prisma.usuario.create({
        data: {
          nombres,
          apellidoPaterno,
          apellidoMaterno,
          correo: correoNorm,
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

    // Enviar email de confirmación al encargado
    const encargado = (body.participantes || []).find((p: any) => p.esResponsable);
    if (encargado?.correo) {
      try {
        const baseUrl = process.env.WEB_URL || 'http://localhost:3000';
        const trackingUrl = `${baseUrl}/seguimiento?ee=${ee.id}`;
        const transporter = createMailTransporter();
        await transporter.sendMail({
          from: process.env.MAIL_FROM,
          to: encargado.correo,
          subject: `Solicitud de inscripción recibida — ${evento.nombre ?? 'Rueda de Negocios'}`,
          html: `
            <div style="font-family:sans-serif;max-width:540px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:12px">
              <h2 style="color:#449D3A;margin-bottom:4px">¡Solicitud recibida con éxito!</h2>
              <p style="color:#374151;margin-bottom:20px">
                Hola <strong>${encargado.nombres ? `${encargado.nombres} ${encargado.apellidoPaterno || ''}`.trim() : encargado.nombreCompleto}</strong>, tu registro como encargado de
                <strong>${empresa.nombre}</strong> en la <strong>${evento.nombre ?? 'Rueda de Negocios'}</strong> fue recibido correctamente.
              </p>
              <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:20px;margin-bottom:20px">
                <p style="color:#6b7280;font-size:13px;margin:0 0 12px;font-weight:600;text-transform:uppercase;letter-spacing:.5px">Resumen de inscripción</p>
                <table style="width:100%;border-collapse:collapse">
                  <tr><td style="padding:5px 0;color:#6b7280;font-size:13px;width:150px">Empresa</td><td style="padding:5px 0;font-weight:700;color:#111827">${empresa.nombre}</td></tr>
                  <tr><td style="padding:5px 0;color:#6b7280;font-size:13px">Estado del pago</td><td style="padding:5px 0;font-weight:700;color:#d97706">Pendiente de verificación</td></tr>
                  <tr><td style="padding:5px 0;color:#6b7280;font-size:13px">Participantes</td><td style="padding:5px 0;font-weight:700;color:#111827">${ee.numeroParticipantes}</td></tr>
                  <tr><td style="padding:5px 0;color:#6b7280;font-size:13px">Monto declarado</td><td style="padding:5px 0;font-weight:700;color:#111827">${ee.montoPagado} Bs.</td></tr>
                </table>
              </div>
              <p style="color:#374151;font-size:14px;margin-bottom:20px">
                Nuestro equipo verificará tu comprobante de pago. Te notificaremos por correo cuando tu cuenta esté habilitada.
              </p>
              <a href="${trackingUrl}" style="display:inline-block;background:#449D3A;color:#fff;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:10px;font-size:14px">
                Ver estado de mi inscripción →
              </a>
              <p style="color:#9ca3af;font-size:12px;margin-top:24px">Si no realizaste este registro, ignora este correo.</p>
            </div>
          `,
        });
      } catch (_) { /* no bloquear el registro si falla el correo */ }
    }

    return {
      empresaeventoId: ee.id,
      empresa: { id: empresa.id, nombre: empresa.nombre, rubro: empresa.rubro },
      empresaevento: {
        id: ee.id,
        numeroParticipantes: ee.numeroParticipantes,
        montoPagado: ee.montoPagado,
        estadoVerificacionPago: ee.estadoVerificacionPago,
        tipoParticipacion: ee.tipoParticipacion,
      },
      participantes: participantesCreados,
      participantesOmitidos,
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
      maxParticipantesPorEmpresa: Number(body.maxParticipantesPorEmpresa) || 5,
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
  async getAdminEmpresaParticipantes(@Param('id') id: string) {
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
    const isDevEmail = !process.env.MAIL_USER || process.env.MAIL_USER === 'tu_correo@gmail.com';
    const transporter = isDevEmail ? null : createMailTransporter();

    // Also update initial comprobante status
    await (this.prisma.empresaeventocomprobantes as any).updateMany({
      where: { empresaEvento_id: pagoId, tipoPago: 'INICIAL', estaActivo: 1 },
      data: { estadoPago: 'COMPLETADO' },
    });

    for (const eu of (ee as any).empresa_usuario.filter((e: any) => e.estaActivo !== 0)) {
      const u = eu.usuario;
      const pwd = generarPasswordTemporal();
      const hashed = await bcrypt.hash(pwd, 10);
      await this.prisma.usuario.update({
        where: { id: u.id },
        data: { contrasenia: hashed, creadoModificadoFecha: new Date() },
      });

      const esEncargado = eu.esResponsable === 1;
      const encargadoBanner = esEncargado
        ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 18px;margin-bottom:20px;display:flex;align-items:center;gap:10px">
            <span style="font-size:20px">⭐</span>
            <div>
              <p style="margin:0;font-weight:700;color:#166534;font-size:14px">Eres el Encargado de la empresa</p>
              <p style="margin:4px 0 0;color:#15803d;font-size:12px">Podrás gestionar reuniones, ver mesas asignadas y el directorio de empresas.</p>
            </div>
          </div>`
        : '';

      if (isDevEmail || !transporter) {
        console.log('\n╔══════════════════════════════════════════════════════╗');
        console.log('║   [DEV] CREDENCIALES GENERADAS (email no enviado)    ║');
        console.log('╠══════════════════════════════════════════════════════╣');
        console.log(`║  Empresa  : ${(ee as any).empresa?.nombre ?? ''}`);
        console.log(`║  Nombre   : ${u.nombres} ${u.apellidoPaterno}`);
        console.log(`║  Correo   : ${u.correo}`);
        console.log(`║  Contraseña: ${pwd}`);
        console.log(`║  Encargado: ${esEncargado ? 'SÍ' : 'NO'}`);
        console.log('╚══════════════════════════════════════════════════════╝\n');
        continue;
      }

      try {
        await transporter.sendMail({
          from: process.env.MAIL_FROM,
          to: u.correo,
          subject: `¡Tu acceso ha sido aprobado! — ${(ee as any).evento?.nombre ?? 'Rueda de Negocios'}`,
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:12px">
              <h2 style="color:#449D3A;margin-bottom:4px">¡Bienvenido/a a la Rueda de Negocios!</h2>
              <p style="color:#374151;margin-bottom:20px">
                Hola <strong>${u.nombres} ${u.apellidoPaterno}</strong>, tu registro como parte de
                <strong>${(ee as any).empresa?.nombre ?? ''}</strong> ha sido <strong style="color:#449D3A">aprobado</strong>.
              </p>
              ${encargadoBanner}
              <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:20px;margin-bottom:20px">
                <p style="color:#6b7280;font-size:13px;margin:0 0 12px;font-weight:600;text-transform:uppercase;letter-spacing:.5px">Tus credenciales de acceso</p>
                <table style="width:100%;border-collapse:collapse">
                  <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;width:110px">Correo</td><td style="padding:6px 0;font-weight:700;color:#111827">${u.correo}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280;font-size:13px">Contraseña</td><td style="padding:6px 0;font-weight:700;color:#111827;font-size:18px;letter-spacing:2px">${pwd}</td></tr>
                </table>
              </div>
              <p style="color:#9ca3af;font-size:12px;margin:0">Por seguridad, te recomendamos cambiar tu contraseña después del primer inicio de sesión.</p>
            </div>
          `,
        });
      } catch (emailErr) {
        console.warn(`[WARN] No se pudo enviar email a ${u.correo}:`, emailErr instanceof Error ? emailErr.message : emailErr);
        console.log(`[DEV] Credenciales para ${u.correo} — contraseña: ${pwd}`);
      }
    }

    return ee;
  }

  @Put('admin/pagos/:id/observar')
  async observarPago(@Param('id') id: string, @Body() body: { observacion: string }) {
    if (!body.observacion?.trim()) throw new BadRequestException('La observación es requerida');

    const ee: any = await this.prisma.empresaevento.update({
      where: { id: Number(id) },
      data: {
        estadoVerificacionPago: 'OBSERVADO',
        estadoHabilitacionAcceso: 'NO_HABILITADO',
        observacionSobreComprobante: body.observacion,
      },
      include: {
        empresa: true,
        evento: true,
        empresa_usuario: {
          where: { esResponsable: 1 },
          include: { usuario: { select: { nombres: true, apellidoPaterno: true, correo: true } } },
        },
      },
    } as any);

    const encargado = ee.empresa_usuario?.[0]?.usuario;
    if (encargado?.correo) {
      try {
        const transporter = createMailTransporter();
        const baseUrl = process.env.WEB_URL || 'http://localhost:3000';
        const trackingUrl = `${baseUrl}/seguimiento?ee=${ee.id}`;
        await transporter.sendMail({
          from: process.env.MAIL_FROM,
          to: encargado.correo,
          subject: `Comprobante con observaciones — ${ee.evento?.nombre ?? 'Rueda de Negocios'}`,
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:12px">
              <h2 style="color:#d97706;margin-bottom:4px">Comprobante con observaciones</h2>
              <p style="color:#374151;margin-bottom:20px">
                Hola <strong>${encargado.nombres} ${encargado.apellidoPaterno}</strong>, el comprobante de pago de
                <strong>${ee.empresa?.nombre ?? ''}</strong> para el evento <strong>${ee.evento?.nombre ?? 'Rueda de Negocios'}</strong> ha sido revisado y presenta observaciones.
              </p>
              <div style="background:#fff;border:2px solid #fbbf24;border-radius:10px;padding:20px;margin-bottom:20px">
                <p style="color:#92400e;font-size:13px;margin:0 0 8px;font-weight:700;text-transform:uppercase">Observación del equipo:</p>
                <p style="color:#374151;font-size:14px;margin:0">${body.observacion}</p>
              </div>
              <p style="color:#374151;font-size:14px;margin-bottom:20px">
                Puedes subir un nuevo comprobante corregido directamente desde el enlace de seguimiento de tu inscripción:
              </p>
              <a href="${trackingUrl}" style="display:inline-block;background:#d97706;color:#fff;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:10px;font-size:14px;margin-bottom:20px">
                Ver seguimiento y subir nuevo comprobante →
              </a>
              <p style="color:#6b7280;font-size:13px;margin:0">
                Si tienes dudas o necesitas ayuda, puedes responder a este correo o contactarnos directamente en
                <a href="mailto:${process.env.MAIL_FROM}" style="color:#449D3A;font-weight:700">${process.env.MAIL_FROM}</a>.
              </p>
            </div>
          `,
        });
      } catch (_) { /* no bloquear si falla el correo */ }
    }

    return ee;
  }

  @Put('admin/pagos/:id/rechazar')
  async rechazarPago(@Param('id') id: string, @Body() body: { motivo: string }) {
    if (!body.motivo?.trim()) throw new BadRequestException('El motivo de rechazo es requerido');

    const ee: any = await this.prisma.empresaevento.update({
      where: { id: Number(id) },
      data: {
        estadoVerificacionPago: 'RECHAZADO',
        estadoHabilitacionAcceso: 'NO_HABILITADO',
        motivoRechazoAcceso: body.motivo,
        observacionSobreComprobante: body.motivo,
      },
      include: {
        empresa: true,
        evento: true,
        empresa_usuario: {
          where: { esResponsable: 1 },
          include: { usuario: { select: { nombres: true, apellidoPaterno: true, correo: true } } },
        },
      },
    } as any);

    const encargado = ee.empresa_usuario?.[0]?.usuario;
    if (encargado?.correo) {
      try {
        const transporter = createMailTransporter();
        await transporter.sendMail({
          from: process.env.MAIL_FROM,
          to: encargado.correo,
          subject: `Comprobante de pago rechazado — ${ee.evento?.nombre ?? 'Rueda de Negocios'}`,
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:12px">
              <h2 style="color:#dc2626;margin-bottom:4px">Comprobante rechazado</h2>
              <p style="color:#374151;margin-bottom:20px">
                Hola <strong>${encargado.nombres} ${encargado.apellidoPaterno}</strong>, lamentamos informarte que el comprobante de pago de
                <strong>${ee.empresa?.nombre ?? ''}</strong> para el evento <strong>${ee.evento?.nombre ?? 'Rueda de Negocios'}</strong> ha sido rechazado.
              </p>
              <div style="background:#fff;border:2px solid #fca5a5;border-radius:10px;padding:20px;margin-bottom:20px">
                <p style="color:#991b1b;font-size:13px;margin:0 0 8px;font-weight:700;text-transform:uppercase">Motivo del rechazo:</p>
                <p style="color:#374151;font-size:14px;margin:0">${body.motivo}</p>
              </div>
              <p style="color:#6b7280;font-size:13px;margin:0">
                Si tienes dudas o crees que hay un error, puedes responder a este correo o contactarnos directamente en
                <a href="mailto:${process.env.MAIL_FROM}" style="color:#449D3A;font-weight:700">${process.env.MAIL_FROM}</a>.
              </p>
            </div>
          `,
        });
      } catch (_) { /* no bloquear si falla el correo */ }
    }

    return ee;
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
  async updateEventoConfig(@Body() body: {
    tiempoEntreReuniones?: number;
    duracionReunion?: number;
    maxParticipantesPorEmpresa?: number;
    costoParticipanteExtra?: number;
    cantidadParticipantesIncluidos?: number;
    montoBaseIncripcionBolivianos?: number;
  }) {
    const eventoId = await this.getPrincipalEventoId();
    if (!eventoId) throw new BadRequestException('No hay evento principal configurado');
    const data: Record<string, any> = { creadoModificadoFecha: new Date() };
    if (body.tiempoEntreReuniones !== undefined) data.tiempoEntreReuniones = Number(body.tiempoEntreReuniones);
    if (body.duracionReunion !== undefined) data.duracionReunion = Number(body.duracionReunion);
    if (body.maxParticipantesPorEmpresa !== undefined) data.maxParticipantesPorEmpresa = Number(body.maxParticipantesPorEmpresa);
    if (body.costoParticipanteExtra !== undefined) data.costoParticipanteExtra = Number(body.costoParticipanteExtra);
    if (body.cantidadParticipantesIncluidos !== undefined) data.cantidadParticipantesIncluidos = Number(body.cantidadParticipantesIncluidos);
    if (body.montoBaseIncripcionBolivianos !== undefined) data.montoBaseIncripcionBolivianos = Number(body.montoBaseIncripcionBolivianos);
    return await this.prisma.evento.update({
      where: { id: eventoId },
      data,
      select: {
        duracionReunion: true, tiempoEntreReuniones: true,
        cantidadTotalMesasEvento: true, capacidadPersonasPorMesa: true,
        maxParticipantesPorEmpresa: true, costoParticipanteExtra: true,
        cantidadParticipantesIncluidos: true, montoBaseIncripcionBolivianos: true,
      },
    });
  }

  @Get('admin/evento/config')
  async getEventoConfig() {
    const eventoId = await this.getPrincipalEventoId();
    if (!eventoId) throw new BadRequestException('No hay evento principal configurado');
    return await this.prisma.evento.findUnique({
      where: { id: eventoId },
      select: {
        id: true, nombre: true, edicion: true,
        duracionReunion: true, tiempoEntreReuniones: true,
        cantidadTotalMesasEvento: true, capacidadPersonasPorMesa: true,
        maxParticipantesPorEmpresa: true, costoParticipanteExtra: true,
        cantidadParticipantesIncluidos: true, montoBaseIncripcionBolivianos: true,
        fechaInicioEvento: true, fechaFinEvento: true,
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
      // Obtener el usuario más reciente con ese correo (evita afectar duplicados históricos)
      const u = await this.prisma.usuario.findFirst({
        where: { correo: body.correo, estaActivo: 1 },
        select: { id: true, nombres: true, correo: true },
        orderBy: { id: 'desc' },
      });
      if (!u) throw new BadRequestException('No existe una cuenta registrada con ese correo electrónico.');

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

  // ─── EMPRESA PARTICIPANTE ────────────────────────────────────────────────────

  // Helper privado: obtiene el contexto de empresa del usuario para el evento principal
  private async getEmpresaCtx(usuarioId: number) {
    const eventoId = await this.getPrincipalEventoId();
    const eu = await this.prisma.empresa_usuario.findFirst({
      where: {
        usuario_id: usuarioId,
        ...(eventoId ? { empresaevento: { evento_id: eventoId } } : {}),
      },
      include: {
        empresa: true,
        empresaevento: { include: { evento: true } },
        usuario: { select: { id: true, nombres: true, apellidoPaterno: true, apellidoMaterno: true, correo: true, telefono: true, rolEvento: true } },
      },
    });
    if (!eu) throw new BadRequestException('No se encontró empresa para este usuario');
    return eu;
  }

  // Helper: genera franjas horarias del evento
  private generarFranjas(evento: any): { inicio: Date; fin: Date }[] {
    const slots: { inicio: Date; fin: Date }[] = [];
    const durMs = evento.duracionReunion * 60000;
    const bufMs = evento.tiempoEntreReuniones * 60000;
    const intervalMs = durMs + bufMs;
    let current = new Date(evento.fechaInicioEvento);
    const end = new Date(evento.fechaFinEvento);
    while (current.getTime() + durMs <= end.getTime()) {
      slots.push({ inicio: new Date(current), fin: new Date(current.getTime() + durMs) });
      current = new Date(current.getTime() + intervalMs);
    }
    return slots;
  }

  // Helper: verifica que eeId es un empresaevento habilitado del evento principal
  private async verificarEE(eeId: number) {
    const ee = await this.prisma.empresaevento.findFirst({
      where: { id: eeId, estadoVerificacionPago: 'COMPLETADO', estadoHabilitacionAcceso: 'HABILITADO', estaActivo: 1 },
    });
    if (!ee) throw new BadRequestException('Empresa no habilitada o no encontrada');
    return ee;
  }

  @Get('empresa/mi-empresa')
  async getEmpresaInfo(@Query('usuarioId') usuarioId: string) {
    if (!usuarioId) throw new BadRequestException('usuarioId requerido');
    const eu = await this.getEmpresaCtx(Number(usuarioId));
    return {
      empresaUsuarioId: eu.id,
      empresaeventoId: eu.empresaevento_id,
      usuario: eu.usuario,
      empresa: {
        id: eu.empresa.id, nombre: eu.empresa.nombre, rubro: eu.empresa.rubro,
        correoCorporativo: eu.empresa.correoCorporativo, telefonoWhatsapp: eu.empresa.telefonoWhatsapp,
        sitioWeb: eu.empresa.sitioWeb, descripcion: eu.empresa.descripcion, urlFotoPerfil: eu.empresa.urlFotoPerfil,
      },
      esResponsable: eu.esResponsable === 1,
      evento: eu.empresaevento?.evento ?? null,
      estadoPago: eu.empresaevento?.estadoVerificacionPago ?? 'PENDIENTE',
      estadoAcceso: eu.empresaevento?.estadoHabilitacionAcceso ?? 'PENDIENTE',
      tipoParticipacion: eu.empresaevento?.tipoParticipacion ?? null,
      numeroParticipantes: eu.empresaevento?.numeroParticipantes ?? null,
    };
  }

  @Get('empresa/evento')
  async getEmpresaEvento() {
    const eventoId = await this.getPrincipalEventoId();
    if (!eventoId) throw new BadRequestException('No hay evento activo');
    return this.prisma.evento.findUnique({ where: { id: eventoId } });
  }

  @Get('empresa/actividades')
  async getEmpresaActividades() {
    const eventoId = await this.getPrincipalEventoId();
    if (!eventoId) return [];
    const acts = await this.prisma.actividadprograma.findMany({
      where: { evento_id: eventoId, estaActivo: 1 },
      orderBy: [{ fechaActividad: 'asc' }, { horaInicioActividad: 'asc' }],
    });
    return acts.map((a) => ({
      id: a.id,
      nombreActividad: a.nombreActividad,
      descripcionActividad: a.descripcionActividad,
      tipoActividad: a.tipoActividad,
      estadoActividad: a.estadoActividad,
      fechaActividad: a.fechaActividad,
      horaInicioActividad: a.horaInicioActividad,
      horaFinActividad: a.horaFinActividad,
      lugarActividad: (a as any).nombreSalaEspacio ?? null,
      nombreResponsableActividad: (a as any).nombreCompletoPilaExpositor ?? null,
      organizacion: (a as any).organizacionDelExpositor ?? null,
    }));
  }

  @Get('empresa/comunicados')
  async getEmpresaComunicados() {
    const eventoId = await this.getPrincipalEventoId();
    if (!eventoId) return [];
    const noticias = await this.prisma.noticia.findMany({
      where: { evento_id: eventoId, estaActivo: 1, estadoPublicacion: 'PUBLICADO' },
      orderBy: { fechaHoraPublicacion: 'desc' },
      include: { usuario: { select: { id: true, nombres: true, apellidoPaterno: true } } },
    });
    return noticias.map((n) => ({
      id: n.id,
      titulo: n.tituloNoticia,
      contenido: n.contenidoNoticia,
      urlImagen: (n as any).urlImagenNoticia ?? null,
      tipoNoticia: n.tipoNoticia,
      fechaHoraPublicacion: n.fechaHoraPublicacion,
      usuario: n.usuario,
    }));
  }

  @Get('empresa/empresas')
  async getEmpresasParticipantes(@Query('eeId') eeId: string) {
    if (!eeId) throw new BadRequestException('eeId requerido');
    const eventoId = await this.getPrincipalEventoId();
    if (!eventoId) return [];
    const ees = await this.prisma.empresaevento.findMany({
      where: {
        evento_id: eventoId,
        estaActivo: 1,
        estadoVerificacionPago: 'COMPLETADO',
        estadoHabilitacionAcceso: 'HABILITADO',
        id: { not: Number(eeId) },
      },
      include: {
        empresa: { include: { ciudad: { include: { pais: true } } } },
      },
      orderBy: { empresa: { nombre: 'asc' } },
    });
    return ees.map((ee) => ({
      empresaeventoId: ee.id,
      empresaId: ee.empresa_id,
      nombre: ee.empresa.nombre,
      rubro: ee.empresa.rubro,
      descripcion: ee.empresa.descripcion,
      urlFotoPerfil: ee.empresa.urlFotoPerfil,
      sitioWeb: ee.empresa.sitioWeb,
      ciudad: ee.empresa.ciudad?.nombre ?? null,
      pais: ee.empresa.ciudad?.pais?.nombre ?? null,
      tipoParticipacion: ee.tipoParticipacion,
    }));
  }

  @Get('empresa/horarios')
  async getHorariosDisponibles(
    @Query('eeId') eeId: string,
    @Query('eeReceptoraId') eeReceptoraId: string,
  ) {
    if (!eeId || !eeReceptoraId) throw new BadRequestException('eeId y eeReceptoraId requeridos');
    const eventoId = await this.getPrincipalEventoId();
    if (!eventoId) return [];
    const evento = await this.prisma.evento.findUnique({ where: { id: eventoId } });
    if (!evento) return [];

    const franjas = this.generarFranjas(evento);
    if (franjas.length === 0) return [];

    // Reuniones activas de ambas empresas en este evento
    const reunionesA = await this.prisma.reunion.findMany({
      where: {
        evento_id: eventoId, estaActivo: 1,
        estadoReunion: { not: 'CANCELADA' },
        solicitudreunion: {
          OR: [
            { empresaEvento_id: Number(eeId) },
            { empresaEventorReceptora_id: Number(eeId) },
          ],
        },
      },
      select: { fechaHoraInicioReunion: true, fechaHoraFinReunion: true },
    });
    const reunionesB = await this.prisma.reunion.findMany({
      where: {
        evento_id: eventoId, estaActivo: 1,
        estadoReunion: { not: 'CANCELADA' },
        solicitudreunion: {
          OR: [
            { empresaEvento_id: Number(eeReceptoraId) },
            { empresaEventorReceptora_id: Number(eeReceptoraId) },
          ],
        },
      },
      select: { fechaHoraInicioReunion: true, fechaHoraFinReunion: true },
    });

    const solapaCon = (r: { fechaHoraInicioReunion: Date; fechaHoraFinReunion: Date }, ini: Date, fin: Date) =>
      r.fechaHoraInicioReunion < fin && r.fechaHoraFinReunion > ini;

    return franjas.map((f) => ({
      inicio: f.inicio.toISOString(),
      fin: f.fin.toISOString(),
      disponible:
        !reunionesA.some((r) => solapaCon(r, f.inicio, f.fin)) &&
        !reunionesB.some((r) => solapaCon(r, f.inicio, f.fin)),
    }));
  }

  @Get('empresa/mesas-disponibles')
  async getMesasDisponiblesEmpresa(
    @Query('inicio') inicio: string,
    @Query('fin') fin: string,
  ) {
    if (!inicio || !fin) throw new BadRequestException('inicio y fin requeridos');
    const eventoId = await this.getPrincipalEventoId();
    if (!eventoId) return [];
    const iniDate = new Date(inicio);
    const finDate = new Date(fin);

    const todasMesas = await this.prisma.mesa.findMany({
      where: { evento_id: eventoId, estaActivo: 1, estaHabilitada: 1 },
      orderBy: { numeroMesa: 'asc' },
    });
    // Deduplicate by numeroMesa — keep lowest ID per number
    const seenMesa = new Map<number, typeof todasMesas[0]>();
    for (const m of todasMesas) {
      if (!seenMesa.has(m.numeroMesa)) seenMesa.set(m.numeroMesa, m);
    }
    const mesasUnicas = [...seenMesa.values()];
    const reunionesEnSlot = await this.prisma.reunion.findMany({
      where: {
        evento_id: eventoId, estaActivo: 1,
        estadoReunion: { not: 'CANCELADA' },
        fechaHoraInicioReunion: { lt: finDate },
        fechaHoraFinReunion: { gt: iniDate },
      },
      select: { mesa_id: true },
    });
    const ocupadasIds = new Set(reunionesEnSlot.map((r) => r.mesa_id));
    return mesasUnicas
      .filter((m) => !ocupadasIds.has(m.id))
      .map((m) => ({ id: m.id, numeroMesa: m.numeroMesa, capacidadPersonas: m.capacidadPersonas }));
  }

  @Post('empresa/solicitudes')
  async crearSolicitud(@Body() body: any) {
    const { eeId, eeReceptoraId, euId, tipo, inicio, fin, mesaId, enlace, mensaje } = body;
    if (!eeId || !eeReceptoraId || !euId || !tipo || !inicio || !fin)
      throw new BadRequestException('Campos requeridos: eeId, eeReceptoraId, euId, tipo, inicio, fin');
    if (Number(eeId) === Number(eeReceptoraId))
      throw new BadRequestException('No puedes solicitar una reunión contigo mismo');

    await this.verificarEE(Number(eeId));
    await this.verificarEE(Number(eeReceptoraId));

    // Verificar pertenencia del eu al eeId
    const euRecord = await this.prisma.empresa_usuario.findFirst({
      where: { id: Number(euId), empresaevento_id: Number(eeId) },
    });
    if (!euRecord) throw new BadRequestException('No tienes permiso para esta empresa');

    const iniDate = new Date(inicio);
    const finDate = new Date(fin);

    // Evitar duplicado exacto: mismo emisor → mismo receptor, mismo horario, estado activo
    const duplicado = await this.prisma.solicitudreunion.findFirst({
      where: {
        estaActivo: 1,
        estadoSolicitud: { notIn: ['RECHAZADA', 'CANCELADA'] },
        fechaHoraInicioPropuesta: iniDate,
        empresaEvento_id: Number(eeId),
        empresaEventorReceptora_id: Number(eeReceptoraId),
      },
    });
    if (duplicado) throw new BadRequestException('Ya enviaste una solicitud para ese horario a esta empresa');

    // Para reuniones virtuales: asignar mesa automáticamente
    let mesaAsignada: number | null = mesaId ? Number(mesaId) : null;
    const eventoId = await this.getPrincipalEventoId();

    if (!mesaAsignada) {
      const mesaLibre = await this.prisma.mesa.findFirst({
        where: {
          evento_id: eventoId!,
          estaActivo: 1,
          estaHabilitada: 1,
          reunion: {
            none: {
              estaActivo: 1,
              estadoReunion: { not: 'CANCELADA' },
              fechaHoraInicioReunion: { lt: finDate },
              fechaHoraFinReunion: { gt: iniDate },
            },
          },
        },
        orderBy: { numeroMesa: 'asc' },
      });
      if (!mesaLibre) throw new BadRequestException('No hay mesas disponibles para ese horario');
      mesaAsignada = mesaLibre.id;
    } else {
      // Validar que la mesa esté libre
      const ocupada = await this.prisma.reunion.findFirst({
        where: {
          mesa_id: mesaAsignada, estaActivo: 1,
          estadoReunion: { not: 'CANCELADA' },
          fechaHoraInicioReunion: { lt: finDate },
          fechaHoraFinReunion: { gt: iniDate },
        },
      });
      if (ocupada) throw new BadRequestException('La mesa seleccionada ya está ocupada en ese horario');
    }

    const sol = await this.prisma.solicitudreunion.create({
      data: {
        empresaEvento_id: Number(eeId),
        empresaEventorReceptora_id: Number(eeReceptoraId),
        empresa_usuarioResponsableSolicitud: Number(euId),
        tipoReunion: tipo,
        enlaceReunionVirtual: enlace || null,
        fechaHoraInicioPropuesta: iniDate,
        fechaHoraFinPropuesta: finDate,
        mensajeParaEmpresaReceptora: mensaje || null,
        estadoSolicitud: 'PENDIENTE',
        estaActivo: 1,
      },
    });

    // Guardar la mesa reservada en el solicitud (usamos un campo auxiliar en reunion al aceptar)
    // Por ahora guardamos el mesaId en memoria de la respuesta para que el frontend pueda mostrarlo
    return { ...sol, mesaId: mesaAsignada };
  }

  @Get('empresa/solicitudes')
  async getSolicitudesEmpresa(@Query('eeId') eeId: string) {
    if (!eeId) throw new BadRequestException('eeId requerido');
    const solicitudes = await this.prisma.solicitudreunion.findMany({
      where: {
        estaActivo: 1,
        OR: [
          { empresaEvento_id: Number(eeId) },
          { empresaEventorReceptora_id: Number(eeId) },
        ],
      },
      include: {
        empresaevento_solicitudreunion_empresaEvento_idToempresaevento: {
          include: { empresa: { select: { id: true, nombre: true, rubro: true, urlFotoPerfil: true } } },
        },
        empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento: {
          include: { empresa: { select: { id: true, nombre: true, rubro: true, urlFotoPerfil: true } } },
        },
        reunion: {
          where: { estaActivo: 1 },
          select: { id: true, estadoReunion: true, mesa_id: true, mesa: { select: { numeroMesa: true } } },
        },
      },
      orderBy: { fechaCreacion: 'desc' },
    });

    // Detectar conflictos: solicitudes recibidas PENDIENTE que colisionan con otra del mismo receptor+horario
    return await Promise.all(solicitudes.map(async (s) => {
      let tieneConflicto = false;
      if (s.estadoSolicitud === 'PENDIENTE' && s.empresaEventorReceptora_id === Number(eeId)) {
        const colision = await this.prisma.solicitudreunion.findFirst({
          where: {
            id: { not: s.id },
            estaActivo: 1,
            estadoSolicitud: 'PENDIENTE',
            empresaEventorReceptora_id: Number(eeId),
            fechaHoraInicioPropuesta: s.fechaHoraInicioPropuesta,
          },
        });
        tieneConflicto = !!colision;
      }
      return {
        id: s.id,
        tipo: s.tipoReunion,
        inicio: s.fechaHoraInicioPropuesta,
        fin: s.fechaHoraFinPropuesta,
        estado: s.estadoSolicitud,
        enlace: s.enlaceReunionVirtual,
        mensaje: s.mensajeParaEmpresaReceptora,
        motivo: s.motivoRechazoSolicitud,
        fechaCreacion: s.fechaCreacion,
        esMiSolicitud: s.empresaEvento_id === Number(eeId),
        tieneConflicto,
        solicitante: (s as any).empresaevento_solicitudreunion_empresaEvento_idToempresaevento?.empresa,
        receptora: (s as any).empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento?.empresa,
        reunion: (s as any).reunion?.[0] ?? null,
      };
    }));
  }

  @Put('empresa/solicitudes/:id/aceptar')
  async aceptarSolicitud(@Param('id') id: string, @Body() body: { eeId: number; mesaId?: number }) {
    const sol = await this.prisma.solicitudreunion.findFirst({
      where: { id: Number(id), estaActivo: 1, estadoSolicitud: 'PENDIENTE' },
    });
    if (!sol) throw new BadRequestException('Solicitud no encontrada o ya procesada');
    if (sol.empresaEventorReceptora_id !== Number(body.eeId))
      throw new BadRequestException('No tienes permiso para aceptar esta solicitud');

    const eventoId = await this.getPrincipalEventoId();
    const iniDate = sol.fechaHoraInicioPropuesta;
    const finDate = sol.fechaHoraFinPropuesta;

    // Determinar mesa
    let mesaId = body.mesaId ?? null;
    if (!mesaId) {
      const mesaLibre = await this.prisma.mesa.findFirst({
        where: {
          evento_id: eventoId!,
          estaActivo: 1, estaHabilitada: 1,
          reunion: {
            none: {
              estaActivo: 1, estadoReunion: { not: 'CANCELADA' },
              fechaHoraInicioReunion: { lt: finDate },
              fechaHoraFinReunion: { gt: iniDate },
            },
          },
        },
        orderBy: { numeroMesa: 'asc' },
      });
      if (!mesaLibre) throw new BadRequestException('No hay mesas disponibles para ese horario. Elige otro momento.');
      mesaId = mesaLibre.id;
    } else {
      const ocupada = await this.prisma.reunion.findFirst({
        where: {
          mesa_id: mesaId, estaActivo: 1, estadoReunion: { not: 'CANCELADA' },
          fechaHoraInicioReunion: { lt: finDate },
          fechaHoraFinReunion: { gt: iniDate },
        },
      });
      if (ocupada) throw new BadRequestException('La mesa ya está ocupada. Elige otra.');
    }

    // Verificar disponibilidad de ambas empresas
    for (const eeCheck of [sol.empresaEvento_id, sol.empresaEventorReceptora_id]) {
      const conflicto = await this.prisma.reunion.findFirst({
        where: {
          estaActivo: 1, estadoReunion: { not: 'CANCELADA' },
          fechaHoraInicioReunion: { lt: finDate },
          fechaHoraFinReunion: { gt: iniDate },
          solicitudreunion: {
            OR: [
              { empresaEvento_id: eeCheck },
              { empresaEventorReceptora_id: eeCheck },
            ],
          },
        },
      });
      if (conflicto) throw new BadRequestException('Una de las empresas ya tiene una reunión confirmada en ese horario. Rechaza esta solicitud y elige otro horario.');
    }

    const [reunion] = await Promise.all([
      this.prisma.reunion.create({
        data: {
          solicitudReunion_id: Number(id),
          mesa_id: mesaId,
          evento_id: eventoId!,
          tipoReunion: sol.tipoReunion,
          fechaHoraInicioReunion: iniDate,
          fechaHoraFinReunion: finDate,
          estadoReunion: 'PROGRAMADA',
          seEnvioNotificacionDeRetraso: 0,
          cantidadAsistentesRegistrados: 0,
          estaActivo: 1,
        },
      }),
      this.prisma.solicitudreunion.update({
        where: { id: Number(id) },
        data: { estadoSolicitud: 'ACEPTADA', creadoModificadoFecha: new Date() },
      }),
    ]);

    return { ok: true, reunion };
  }

  @Put('empresa/solicitudes/:id/rechazar')
  async rechazarSolicitud(@Param('id') id: string, @Body() body: { eeId: number; motivo?: string }) {
    const sol = await this.prisma.solicitudreunion.findFirst({
      where: { id: Number(id), estaActivo: 1, estadoSolicitud: 'PENDIENTE' },
    });
    if (!sol) throw new BadRequestException('Solicitud no encontrada o ya en estado final');
    if (sol.empresaEventorReceptora_id !== Number(body.eeId))
      throw new BadRequestException('Solo la empresa receptora puede rechazar esta solicitud');

    await this.prisma.solicitudreunion.update({
      where: { id: Number(id) },
      data: { estadoSolicitud: 'RECHAZADA', motivoRechazoSolicitud: body.motivo || null, creadoModificadoFecha: new Date() },
    });
    return { ok: true };
  }

  @Put('empresa/solicitudes/:id/cancelar')
  async cancelarSolicitud(@Param('id') id: string, @Body() body: { eeId: number }) {
    if (!body.eeId) throw new BadRequestException('eeId requerido');
    const sol = await this.prisma.solicitudreunion.findFirst({
      where: { id: Number(id), estaActivo: 1, estadoSolicitud: 'PENDIENTE' },
    });
    if (!sol) throw new BadRequestException('Solicitud no encontrada o ya en estado final');
    if (sol.empresaEvento_id !== Number(body.eeId))
      throw new BadRequestException('Solo la empresa solicitante puede cancelar esta solicitud');

    await this.prisma.solicitudreunion.update({
      where: { id: Number(id) },
      data: { estadoSolicitud: 'CANCELADA', creadoModificadoFecha: new Date() },
    });
    return { ok: true };
  }

  @Get('empresa/reuniones')
  async getReunionesEmpresa(@Query('eeId') eeId: string) {
    if (!eeId) throw new BadRequestException('eeId requerido');
    const reuniones = await this.prisma.reunion.findMany({
      where: {
        estaActivo: 1,
        estadoReunion: { not: 'CANCELADA' },
        solicitudreunion: {
          estaActivo: 1,
          OR: [
            { empresaEvento_id: Number(eeId) },
            { empresaEventorReceptora_id: Number(eeId) },
          ],
        },
      },
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
          where: { estaActivo: 1, empresaeventoCalificadora_id: Number(eeId) },
          select: { id: true, calificacionReunion: true, rangoAcuerdoComercial: true },
        },
      },
      orderBy: { fechaHoraInicioReunion: 'asc' },
    });

    return reuniones.map((r) => {
      const sol = (r as any).solicitudreunion;
      const solicitanteEe = sol?.empresaevento_solicitudreunion_empresaEvento_idToempresaevento;
      const receptoraEe = sol?.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento;
      const soyA = solicitanteEe?.id === Number(eeId);
      const contraparte = soyA ? receptoraEe?.empresa : solicitanteEe?.empresa;
      return {
        id: r.id,
        tipo: r.tipoReunion,
        inicio: r.fechaHoraInicioReunion,
        fin: r.fechaHoraFinReunion,
        estado: r.estadoReunion,
        mesa: r.mesa,
        enlace: (r as any).enlaceReunionVirtual ?? sol?.enlaceReunionVirtual ?? null,
        contraparte,
        miResultado: (r as any).resultadoreunion?.[0] ?? null,
        solicitanteEeId: solicitanteEe?.id,
        receptoraEeId: receptoraEe?.id,
      };
    });
  }

  @Post('empresa/resultados')
  async registrarResultado(@Body() body: any) {
    const { eeId, euId, reunionId, calificacion, rango, observaciones } = body;
    if (!eeId || !euId || !reunionId || !calificacion || !rango)
      throw new BadRequestException('Campos requeridos: eeId, euId, reunionId, calificacion, rango');

    // Verificar que la reunión existe y la empresa participa
    const reunion = await this.prisma.reunion.findFirst({
      where: {
        id: Number(reunionId), estaActivo: 1,
        solicitudreunion: {
          OR: [
            { empresaEvento_id: Number(eeId) },
            { empresaEventorReceptora_id: Number(eeId) },
          ],
        },
      },
      include: {
        solicitudreunion: {
          select: { empresaEvento_id: true, empresaEventorReceptora_id: true },
        },
      },
    });
    if (!reunion) throw new BadRequestException('Reunión no encontrada o no participas en ella');

    const sol = (reunion as any).solicitudreunion;
    const eeContraria = sol.empresaEvento_id === Number(eeId)
      ? sol.empresaEventorReceptora_id
      : sol.empresaEvento_id;

    // Verificar que no haya un resultado previo de esta empresa para esta reunión
    const yaExiste = await this.prisma.resultadoreunion.findFirst({
      where: { reunion_id: Number(reunionId), empresaeventoCalificadora_id: Number(eeId), estaActivo: 1 },
    });
    if (yaExiste) throw new BadRequestException('Ya registraste un resultado para esta reunión');

    // Verificar euId pertenece al eeId
    const euRecord = await this.prisma.empresa_usuario.findFirst({
      where: { id: Number(euId), empresaevento_id: Number(eeId) },
    });
    if (!euRecord) throw new BadRequestException('No tienes permiso para registrar este resultado');

    return this.prisma.resultadoreunion.create({
      data: {
        reunion_id: Number(reunionId),
        empresaeventoCalificadora_id: Number(eeId),
        empresaeventoCalificada_id: eeContraria,
        empresa_usuario_id: Number(euId),
        calificacionReunion: Number(calificacion),
        rangoAcuerdoComercial: rango,
        observacionesPuntosTratados: observaciones || '',
        estaActivo: 1,
      },
    });
  }

  @Get('empresa/resultados')
  async getResultadosEmpresa(@Query('eeId') eeId: string) {
    if (!eeId) throw new BadRequestException('eeId requerido');
    return this.prisma.resultadoreunion.findMany({
      where: { empresaeventoCalificadora_id: Number(eeId), estaActivo: 1 },
      include: {
        reunion: {
          select: {
            id: true, fechaHoraInicioReunion: true, fechaHoraFinReunion: true,
            tipoReunion: true, estadoReunion: true,
            mesa: { select: { numeroMesa: true } },
            solicitudreunion: {
              select: {
                empresaEvento_id: true, empresaEventorReceptora_id: true,
                empresaevento_solicitudreunion_empresaEvento_idToempresaevento: {
                  select: { empresa: { select: { id: true, nombre: true } } },
                },
                empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento: {
                  select: { empresa: { select: { id: true, nombre: true } } },
                },
              },
            },
          },
        },
        empresaevento_resultadoreunion_empresaeventoCalificada_idToempresaevento: {
          select: { empresa: { select: { id: true, nombre: true } } },
        },
      },
      orderBy: { fechaCreacion: 'desc' },
    });
  }

  @Get('empresa/dashboard-stats')
  async getEmpresaDashboardStats(@Query('eeId') eeId: string) {
    if (!eeId) throw new BadRequestException('eeId requerido');
    const eventoId = await this.getPrincipalEventoId();
    const ahora = new Date();

    const [pendientesRecibidas, pendientesEnviadas, reunionesTotal, nextReunion, comunicados, actividades] =
      await Promise.all([
        // Solicitudes recibidas pendientes
        this.prisma.solicitudreunion.count({
          where: { empresaEventorReceptora_id: Number(eeId), estadoSolicitud: 'PENDIENTE', estaActivo: 1 },
        }),
        // Solicitudes enviadas pendientes
        this.prisma.solicitudreunion.count({
          where: { empresaEvento_id: Number(eeId), estadoSolicitud: 'PENDIENTE', estaActivo: 1 },
        }),
        // Reuniones confirmadas (no canceladas)
        this.prisma.reunion.count({
          where: {
            estaActivo: 1, estadoReunion: { not: 'CANCELADA' },
            solicitudreunion: {
              estaActivo: 1,
              OR: [{ empresaEvento_id: Number(eeId) }, { empresaEventorReceptora_id: Number(eeId) }],
            },
          },
        }),
        // Próxima reunión
        this.prisma.reunion.findFirst({
          where: {
            estaActivo: 1, estadoReunion: { notIn: ['CANCELADA', 'FINALIZADA'] },
            fechaHoraInicioReunion: { gte: ahora },
            solicitudreunion: {
              estaActivo: 1,
              OR: [{ empresaEvento_id: Number(eeId) }, { empresaEventorReceptora_id: Number(eeId) }],
            },
          },
          orderBy: { fechaHoraInicioReunion: 'asc' },
          include: {
            mesa: { select: { numeroMesa: true } },
            solicitudreunion: {
              include: {
                empresaevento_solicitudreunion_empresaEvento_idToempresaevento: {
                  include: { empresa: { select: { id: true, nombre: true } } },
                },
                empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento: {
                  include: { empresa: { select: { id: true, nombre: true } } },
                },
              },
            },
          },
        }),
        // Últimos 3 comunicados publicados
        this.prisma.noticia.findMany({
          where: { ...(eventoId ? { evento_id: eventoId } : {}), estaActivo: 1, estadoPublicacion: 'PUBLICADO' },
          orderBy: { fechaHoraPublicacion: 'desc' },
          take: 3,
          select: { id: true, tituloNoticia: true, tipoNoticia: true, fechaHoraPublicacion: true },
        }),
        // Próximas 3 actividades
        this.prisma.actividadprograma.findMany({
          where: { ...(eventoId ? { evento_id: eventoId } : {}), estaActivo: 1, fechaActividad: { gte: ahora } },
          orderBy: [{ fechaActividad: 'asc' }, { horaInicioActividad: 'asc' }],
          take: 3,
          select: { id: true, nombreActividad: true, fechaActividad: true, horaInicioActividad: true, tipoActividad: true },
        }),
      ]);

    let proximaReunion = null;
    if (nextReunion) {
      const sol = (nextReunion as any).solicitudreunion;
      const solicitanteEe = sol?.empresaevento_solicitudreunion_empresaEvento_idToempresaevento;
      const receptoraEe = sol?.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento;
      const soyA = solicitanteEe?.id === Number(eeId);
      proximaReunion = {
        id: nextReunion.id,
        inicio: nextReunion.fechaHoraInicioReunion,
        fin: nextReunion.fechaHoraFinReunion,
        tipo: nextReunion.tipoReunion,
        estado: nextReunion.estadoReunion,
        mesa: nextReunion.mesa,
        contraparte: soyA ? receptoraEe?.empresa : solicitanteEe?.empresa,
        enlace: sol?.enlaceReunionVirtual ?? null,
      };
    }

    return {
      pendientesRecibidas,
      pendientesEnviadas,
      reunionesTotal,
      proximaReunion,
      comunicados: comunicados.map((c) => ({
        id: c.id,
        titulo: c.tituloNoticia,
        tipo: c.tipoNoticia,
        fecha: c.fechaHoraPublicacion,
      })),
      actividades: actividades.map((a) => ({
        id: a.id,
        nombre: a.nombreActividad,
        fecha: a.fechaActividad,
        hora: a.horaInicioActividad,
        tipo: a.tipoActividad,
      })),
    };
  }

  // ─── Participantes endpoints ───────────────────────────────────────────────

  @Get('empresa/participantes')
  async getEmpresaParticipantes(@Query('eeId') eeId: string) {
    if (!eeId) throw new BadRequestException('eeId requerido');

    const ee = await this.prisma.empresaevento.findFirst({
      where: { id: Number(eeId), estaActivo: 1 },
      include: {
        evento: { select: { maxParticipantesPorEmpresa: true } },
        empresa_usuario: {
          where: { estaActivo: 1 },
          include: { usuario: { select: { id: true, nombres: true, apellidoPaterno: true, correo: true, telefono: true } } },
          orderBy: { id: 'asc' },
        },
        empresaeventocomprobantes: {
          where: { estaActivo: 1 },
          orderBy: { fechaCreacion: 'asc' },
        },
      },
    });
    if (!ee) throw new BadRequestException('EmpresaEvento no encontrada');

    const slotsUsados = (ee as any).empresa_usuario.length;
    const slotsPagados = ee.numeroParticipantes;
    const slotsDisponibles = Math.max(0, slotsPagados - slotsUsados);
    const maxPermitidos = (ee as any).evento?.maxParticipantesPorEmpresa ?? 5;

    const pagos = (ee as any).empresaeventocomprobantes.map((c: any) => ({
      id: c.id, tipoPago: c.tipoPago, cantidadParticipantes: c.cantidadParticipantes,
      montoPago: c.montoPago, estadoPago: c.estadoPago, observacion: c.observacion,
      urlComprobante: c.urlComprobantePagoInscripcion, fechaCreacion: c.fechaCreacion,
    }));
    const pagoAdicionalPendiente = pagos.some(
      (p: any) => p.tipoPago === 'ADICIONAL' && p.estadoPago === 'PENDIENTE',
    );

    return {
      slotsUsados, slotsPagados, slotsDisponibles, maxPermitidos, pagoAdicionalPendiente,
      participantes: (ee as any).empresa_usuario.map((eu: any) => ({
        id: eu.id, esResponsable: eu.esResponsable === 1, cargo: eu.cargo, estaActivo: eu.estaActivo,
        usuario: eu.usuario,
      })),
      pagos,
    };
  }

  @Post('empresa/participantes')
  async agregarParticipante(@Body() body: { eeId: number; euEncargadoId: number; nombres: string; apellidoPaterno: string; correo: string; telefono?: string; cargo?: string }) {
    const { eeId, euEncargadoId, nombres, apellidoPaterno, correo, cargo } = body;
    if (!eeId || !euEncargadoId || !nombres || !apellidoPaterno || !correo)
      throw new BadRequestException('Campos requeridos: eeId, euEncargadoId, nombres, apellidoPaterno, correo');

    // Verificar que el encargado es responsable
    const encargado = await this.prisma.empresa_usuario.findFirst({
      where: { id: Number(euEncargadoId), empresaevento_id: Number(eeId), esResponsable: 1, estaActivo: 1 },
    });
    if (!encargado) throw new BadRequestException('Solo el Encargado puede agregar participantes');

    const ee = await this.prisma.empresaevento.findFirst({
      where: { id: Number(eeId), estaActivo: 1, estadoVerificacionPago: 'COMPLETADO', estadoHabilitacionAcceso: 'HABILITADO' },
      include: {
        evento: { select: { id: true, maxParticipantesPorEmpresa: true } },
        empresa_usuario: { where: { estaActivo: 1 } },
      },
    });
    if (!ee) throw new BadRequestException('EmpresaEvento no habilitada');

    const slotsUsados = (ee as any).empresa_usuario.length;
    const slotsPagados = ee.numeroParticipantes;
    const maxPermitidos = (ee as any).evento?.maxParticipantesPorEmpresa ?? 5;

    if (slotsUsados >= slotsPagados) throw new BadRequestException('No hay cupos pagados disponibles. Solicita cupos adicionales.');
    if (slotsUsados >= maxPermitidos) throw new BadRequestException(`No puedes agregar más participantes porque superarías el máximo permitido (${maxPermitidos}) por las reglas del evento.`);

    const correoNorm = correo.trim().toLowerCase();
    // Verificar email único
    const existeUser = await this.prisma.usuario.findFirst({ where: { correo: correoNorm } });
    if (existeUser) throw new BadRequestException('Ya existe un usuario con ese correo');

    const pwd = generarPasswordTemporal();
    const hashed = await bcrypt.hash(pwd, 10);

    const nuevoUsuario = await this.prisma.usuario.create({
      data: {
        nombres: nombres.trim(), apellidoPaterno: apellidoPaterno.trim(),
        correo: correoNorm, contrasenia: hashed,
        telefono: body.telefono?.trim() ?? '+591',
        urlFotoPerfil: `https://ui-avatars.com/api/?name=${encodeURIComponent(nombres)}+${encodeURIComponent(apellidoPaterno)}&background=449D3A&color=fff&size=128`,
        rolEvento: 'EMPRESA', estaActivo: 1,
      },
    });

    const nuevoEu = await this.prisma.empresa_usuario.create({
      data: {
        empresa_id: ee.empresa_id, usuario_id: nuevoUsuario.id,
        empresaevento_id: Number(eeId), cargo: cargo?.trim() ?? 'Participante',
        esResponsable: 0, estaActivo: 1,
      },
    });

    const isDevEmail = !process.env.MAIL_USER || process.env.MAIL_USER === 'tu_correo@gmail.com';
    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║   [PARTICIPANTE] CREDENCIALES GENERADAS              ║');
    console.log(`║  Correo   : ${correoNorm}`);
    console.log(`║  Contraseña: ${pwd}`);
    console.log('╚══════════════════════════════════════════════════════╝\n');

    return { ok: true, participanteId: nuevoEu.id, correo: correoNorm, credencialesEnviadas: !isDevEmail };
  }

  @Put('empresa/participantes/:euId/desactivar')
  async desactivarParticipante(@Param('euId') euId: string, @Body() body: { eeId: number; euEncargadoId: number }) {
    const { eeId, euEncargadoId } = body;
    if (!eeId || !euEncargadoId) throw new BadRequestException('eeId y euEncargadoId requeridos');

    const encargado = await this.prisma.empresa_usuario.findFirst({
      where: { id: Number(euEncargadoId), empresaevento_id: Number(eeId), esResponsable: 1, estaActivo: 1 },
    });
    if (!encargado) throw new BadRequestException('Solo el Encargado puede desactivar participantes');

    if (Number(euId) === Number(euEncargadoId)) throw new BadRequestException('No puedes desactivarte a ti mismo');

    const eu = await this.prisma.empresa_usuario.findFirst({
      where: { id: Number(euId), empresaevento_id: Number(eeId), esResponsable: 0, estaActivo: 1 },
    });
    if (!eu) throw new BadRequestException('Participante no encontrado o no se puede desactivar');

    await this.prisma.empresa_usuario.update({
      where: { id: Number(euId) },
      data: { estaActivo: 0 },
    });
    await this.prisma.usuario.update({
      where: { id: eu.usuario_id },
      data: { estaActivo: 0 },
    });

    return { ok: true };
  }

  // ─── Pagos adicionales endpoints ───────────────────────────────────────────

  @Post('empresa/pagos-adicionales')
  async solicitarPagoAdicional(@Body() body: { eeId: number; euEncargadoId: number; cantidadParticipantes: number; urlComprobante: string }) {
    const { eeId, euEncargadoId, cantidadParticipantes, urlComprobante } = body;
    if (!eeId || !euEncargadoId || !cantidadParticipantes || !urlComprobante)
      throw new BadRequestException('Campos requeridos: eeId, euEncargadoId, cantidadParticipantes, urlComprobante');

    const encargado = await this.prisma.empresa_usuario.findFirst({
      where: { id: Number(euEncargadoId), empresaevento_id: Number(eeId), esResponsable: 1 },
    });
    if (!encargado) throw new BadRequestException('Solo el Encargado puede solicitar cupos adicionales');

    const ee = await this.prisma.empresaevento.findFirst({
      where: { id: Number(eeId), estaActivo: 1 },
      include: {
        evento: { select: { maxParticipantesPorEmpresa: true, costoParticipanteExtra: true } },
        empresa_usuario: { where: { estaActivo: 1 } },
      },
    });
    if (!ee) throw new BadRequestException('EmpresaEvento no encontrada');

    const maxPermitidos = (ee as any).evento?.maxParticipantesPorEmpresa ?? 5;
    const slotsTotalesConNuevos = ee.numeroParticipantes + Number(cantidadParticipantes);

    if (slotsTotalesConNuevos > maxPermitidos)
      throw new BadRequestException(`No puedes solicitar ${cantidadParticipantes} cupos adicionales porque superarías el máximo permitido de ${maxPermitidos} participantes por empresa.`);

    const costo = ((ee as any).evento?.costoParticipanteExtra ?? 0) * Number(cantidadParticipantes);

    const comprobante = await this.prisma.empresaeventocomprobantes.create({
      data: {
        empresaEvento_id: Number(eeId),
        urlComprobantePagoInscripcion: urlComprobante,
        tipoPago: 'ADICIONAL',
        cantidadParticipantes: Number(cantidadParticipantes),
        montoPago: costo,
        estadoPago: 'PENDIENTE',
        estaActivo: 1,
      },
    });

    return { ok: true, comprobanteId: comprobante.id, montoPago: costo };
  }

  @Get('empresa/pagos-adicionales')
  async getPagosAdicionalesEmpresa(@Query('eeId') eeId: string) {
    if (!eeId) throw new BadRequestException('eeId requerido');
    const pagos = await this.prisma.empresaeventocomprobantes.findMany({
      where: { empresaEvento_id: Number(eeId), estaActivo: 1 },
      orderBy: { fechaCreacion: 'asc' },
    });
    return pagos.map((p: any) => ({
      id: p.id, tipoPago: p.tipoPago, cantidadParticipantes: p.cantidadParticipantes,
      montoPago: p.montoPago, estadoPago: p.estadoPago, observacion: p.observacion,
      urlComprobante: p.urlComprobantePagoInscripcion, fechaCreacion: p.fechaCreacion,
    }));
  }

  // ─── Admin pagos adicionales endpoints ────────────────────────────────────

  @Get('admin/pagos-adicionales')
  async getPagosAdicionalesAdmin(@Query('estado') estado?: string) {
    const eventoId = await this.getPrincipalEventoId();
    const where: any = { estaActivo: 1, tipoPago: 'ADICIONAL' };
    if (estado) where.estadoPago = estado;
    if (eventoId) where.empresaevento = { evento_id: eventoId };
    const pagos = await this.prisma.empresaeventocomprobantes.findMany({
      where,
      orderBy: { fechaCreacion: 'desc' },
      include: {
        empresaevento: {
          include: { empresa: true },
        },
      },
    });
    return pagos.map((p: any) => ({
      id: p.id, tipoPago: p.tipoPago, cantidadParticipantes: p.cantidadParticipantes,
      montoPago: p.montoPago, estadoPago: p.estadoPago, observacion: p.observacion,
      urlComprobante: p.urlComprobantePagoInscripcion, fechaCreacion: p.fechaCreacion,
      empresa: p.empresaevento?.empresa ?? null,
      eeId: p.empresaEvento_id,
    }));
  }

  @Put('admin/pagos-adicionales/:id/aprobar')
  async aprobarPagoAdicional(@Param('id') id: string) {
    const comp = await this.prisma.empresaeventocomprobantes.findFirst({
      where: { id: Number(id), tipoPago: 'ADICIONAL', estadoPago: 'PENDIENTE' },
      include: { empresaevento: { include: { evento: { select: { maxParticipantesPorEmpresa: true } } } } },
    });
    if (!comp) throw new BadRequestException('Comprobante adicional no encontrado o ya procesado');

    const ee = (comp as any).empresaevento;
    const maxPermitidos = ee.evento?.maxParticipantesPorEmpresa ?? 5;
    const nuevoTotal = ee.numeroParticipantes + (comp as any).cantidadParticipantes;
    if (nuevoTotal > maxPermitidos)
      throw new BadRequestException(`Aprobar este pago superaría el máximo de ${maxPermitidos} participantes por empresa`);

    await this.prisma.empresaeventocomprobantes.update({
      where: { id: Number(id) },
      data: { estadoPago: 'COMPLETADO' },
    });
    await this.prisma.empresaevento.update({
      where: { id: ee.id },
      data: { numeroParticipantes: nuevoTotal, creadoModificadoFecha: new Date() },
    });
    return { ok: true, nuevoTotalSlots: nuevoTotal };
  }

  @Put('admin/pagos-adicionales/:id/rechazar')
  async rechazarPagoAdicional(@Param('id') id: string, @Body() body: { motivo?: string }) {
    const comp = await this.prisma.empresaeventocomprobantes.findFirst({
      where: { id: Number(id), tipoPago: 'ADICIONAL' },
    });
    if (!comp) throw new BadRequestException('Comprobante no encontrado');
    await this.prisma.empresaeventocomprobantes.update({
      where: { id: Number(id) },
      data: { estadoPago: 'RECHAZADO', observacion: body.motivo ?? null },
    });
    return { ok: true };
  }

  @Put('admin/pagos-adicionales/:id/observar')
  async observarPagoAdicional(@Param('id') id: string, @Body() body: { observacion: string }) {
    if (!body.observacion) throw new BadRequestException('observacion requerida');
    await this.prisma.empresaeventocomprobantes.update({
      where: { id: Number(id) },
      data: { estadoPago: 'OBSERVADO', observacion: body.observacion },
    });
    return { ok: true };
  }

  @Get('empresa/perfil')
  async getEmpresaPerfil(@Query('usuarioId') usuarioId: string) {
    if (!usuarioId) throw new BadRequestException('usuarioId requerido');
    const eu = await this.getEmpresaCtx(Number(usuarioId));
    return {
      empresaUsuarioId: eu.id,
      empresaeventoId: eu.empresaevento_id,
      usuario: eu.usuario,
      empresa: eu.empresa,
      cargo: eu.cargo,
      esResponsable: eu.esResponsable === 1,
    };
  }

  @Put('empresa/perfil')
  async updateEmpresaPerfil(@Body() body: any) {
    const { euId, nombres, apellidoPaterno, apellidoMaterno, telefono } = body;
    if (!euId) throw new BadRequestException('euId requerido');
    const eu = await this.prisma.empresa_usuario.findUnique({
      where: { id: Number(euId) },
      select: { usuario_id: true },
    });
    if (!eu) throw new BadRequestException('Registro no encontrado');
    return this.prisma.usuario.update({
      where: { id: eu.usuario_id },
      data: {
        nombres: nombres || undefined,
        apellidoPaterno: apellidoPaterno || undefined,
        apellidoMaterno: apellidoMaterno || null,
        telefono: telefono || undefined,
        creadoModificadoFecha: new Date(),
      },
      select: { id: true, nombres: true, apellidoPaterno: true, apellidoMaterno: true, correo: true, telefono: true },
    });
  }

  @Post('auth/confirmar-reset')
  async confirmarReset(@Body() body: { correo: string; codigo: string; nuevaContrasenia: string }) {
    try {
      if (!body.correo || !body.codigo || !body.nuevaContrasenia)
        throw new BadRequestException('Todos los campos son requeridos');
      if (body.nuevaContrasenia.length < 6)
        throw new BadRequestException('La contraseña debe tener al menos 6 caracteres');

      // Obtener el usuario con token más reciente para ese correo
      const candidatos = await this.prisma.usuario.findMany({
        where: { correo: body.correo, estaActivo: 1, resetToken: { not: null } },
        select: { id: true, resetToken: true, resetTokenExpiry: true },
        orderBy: { id: 'desc' },
      });
      if (!candidatos.length) throw new BadRequestException('Código inválido o expirado');

      // Buscar el primer candidato cuyo token no haya expirado y cuyo código sea correcto
      let usuarioValido: (typeof candidatos)[0] | null = null;
      for (const c of candidatos) {
        const expired = !c.resetTokenExpiry || new Date(c.resetTokenExpiry) < new Date();
        if (expired) continue;
        const valid = await bcrypt.compare(body.codigo, c.resetToken!);
        if (valid) { usuarioValido = c; break; }
      }

      if (!usuarioValido) {
        // Verificar si algún candidato tiene el token correcto pero expirado
        for (const c of candidatos) {
          if (c.resetToken && await bcrypt.compare(body.codigo, c.resetToken)) {
            throw new BadRequestException('El código ha expirado. Solicita uno nuevo');
          }
        }
        throw new BadRequestException('Código incorrecto');
      }

      const hashed = await bcrypt.hash(body.nuevaContrasenia, 10);
      await this.prisma.usuario.update({
        where: { id: usuarioValido.id },
        data: { contrasenia: hashed, resetToken: null, resetTokenExpiry: null, creadoModificadoFecha: new Date() },
      });

      return { ok: true, message: 'Contraseña actualizada correctamente' };
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Error al restablecer contraseña');
    }
  }
}
