import { Controller, Get, Post, Put, Delete, Body, Param, UnauthorizedException, BadRequestException, Query, OnModuleInit } from '@nestjs/common';
import { AppService } from './app.service.js';
import { PrismaService } from './prisma/prisma.service.js';
import { NotificacionesGateway } from './notificaciones/notificaciones.gateway.js';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
import * as QRCode from 'qrcode';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes, createHmac } from 'node:crypto';

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
    private readonly notifGateway: NotificacionesGateway,
  ) {}

  // Notifica a una empresa: persiste en la tabla notificacion (historial/campanita)
  // y emite en tiempo real por Socket.IO. Nunca bloquea el flujo principal.
  private async notificar(
    eeId: number,
    tipo: string,
    titulo: string,
    mensaje: string,
    referenciaId = 0,
    referenciaTabla = '-',
  ) {
    try {
      await this.prisma.notificacion.create({
        data: {
          empresaevento_id: eeId,
          tituloNotificacion: titulo,
          mensajeNotificacion: mensaje,
          tipoNotificacion: tipo,
          referenciaId,
          referenciaNombreTabla: referenciaTabla,
          haSidoLeida: 0,
          estaActivo: 1,
        },
      });
    } catch (_) { /* la notificación en vivo sigue aunque falle la persistencia */ }
    this.notifGateway.emitirParaEe(eeId, tipo, { titulo, mensaje });
  }

  // Base pública para construir URLs de archivos guardados en /uploads (mismo
  // criterio que ImagenesController: PUBLIC_URL en producción, localhost en dev).
  private uploadsBaseUrl(): string {
    return (process.env.PUBLIC_URL || `http://localhost:${process.env.PORT ?? 3334}`).replace(/\/$/, '');
  }

  // Prefijo legible derivado del nombre de la empresa: iniciales de las palabras
  // significativas (descartando sufijos societarios como SRL/SA/LTDA). Se combina
  // con el id para formar un código único por empresa (ej: "RB-EDS-0012").
  private slugCodigoEmpresa(nombre: string): string {
    const IGNORAR = ['SRL', 'SA', 'LTDA', 'SOCIEDAD', 'EMPRESA', 'COMPANIA', 'CIA', 'DE', 'DEL', 'LA', 'EL', 'Y'];
    const palabras = (nombre || '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '') // quitar acentos
      .replace(/[^a-zA-Z0-9\s]/g, ' ')                  // solo alfanum + espacios
      .split(/\s+/)
      .filter(Boolean);
    const signif = palabras.filter((w) => !IGNORAR.includes(w.toUpperCase()));
    const fuente = signif.length ? signif : palabras;
    let iniciales = fuente.map((w) => w[0]).join('').toUpperCase().slice(0, 4);
    if (iniciales.length < 3) {
      iniciales = (fuente[0] ?? 'EMP').toUpperCase().replace(/[^A-Z0-9]/g, '').padEnd(3, 'X').slice(0, 3);
    }
    return iniciales || 'EMP';
  }

  private async asegurarCodigoEmpresa(empresaId: number, codigoActual: string | null, nombre?: string): Promise<string> {
    if (codigoActual) return codigoActual;
    let nom = nombre;
    if (nom === undefined) {
      const emp = await this.prisma.empresa.findUnique({ where: { id: empresaId }, select: { nombre: true } });
      nom = emp?.nombre ?? '';
    }
    const prefijo = this.slugCodigoEmpresa(nom);
    // El id ya garantiza unicidad; ante una colisión improbable se añade sufijo.
    let codigo = `RB-${prefijo}-${String(empresaId).padStart(4, '0')}`;
    let intento = 0;
    while (await this.prisma.empresa.findFirst({ where: { codigo, NOT: { id: empresaId } }, select: { id: true } })) {
      intento += 1;
      codigo = `RB-${prefijo}-${String(empresaId).padStart(4, '0')}-${intento}`;
    }
    await this.prisma.empresa.update({ where: { id: empresaId }, data: { codigo } });
    return codigo;
  }

  // Token estable y no adivinable para la página pública de credencial.
  // Deriva de euId + JWT_SECRET, así el enlace del QR no se puede enumerar.
  private credencialToken(euId: number): string {
    const secret = process.env.JWT_SECRET || 'rueda-cred-secret';
    return createHmac('sha256', secret).update(`credencial-${euId}`).digest('hex').slice(0, 12);
  }

  // Genera la credencial digital (QR) de un participante: un PNG guardado en
  // /uploads que codifica la URL de su credencial pública. Al escanearlo con la
  // cámara abre una página completa que verifica que la empresa está registrada.
  // Se usa en el correo de bienvenida y en "Mi Perfil" (con botón de descarga).
  private async generarCredencialQR(euId: number, _empresaCodigo: string, _nombreCompleto: string): Promise<string> {
    const webUrl = (process.env.WEB_URL || 'http://localhost:3000').replace(/\/$/, '');
    const contenido = `${webUrl}/credencial/${euId}?t=${this.credencialToken(euId)}`;
    const uploadsDir = join(process.cwd(), 'uploads');
    mkdirSync(uploadsDir, { recursive: true });
    const filename = `credencial-${euId}-${randomBytes(4).toString('hex')}.png`;
    const buffer = await QRCode.toBuffer(contenido, { width: 500, margin: 2, color: { dark: '#0f172a', light: '#ffffff' } });
    writeFileSync(join(uploadsDir, filename), buffer);
    const url = `${this.uploadsBaseUrl()}/uploads/${filename}`;
    await this.prisma.empresa_usuario.update({ where: { id: euId }, data: { urlCredencialQR: url } });
    return url;
  }

  async onModuleInit() {
    await this.prisma.empresaevento.updateMany({
      where: { estadoVerificacionPago: 'APROBADO' },
      data: { estaActivo: 0 },
    });
    await this.ensureMesasExist();

    // Recordatorio de reuniones próximas: cada 60s busca reuniones que comienzan
    // dentro de los próximos 15 minutos y avisa a ambas empresas (una sola vez,
    // usando seEnvioNotificacionDeRetraso como bandera de enviado).
    setInterval(() => { this.enviarRecordatoriosReuniones().catch(() => {}); }, 60_000);
    // Cierre automático: una reunión en curso dura lo que definió el admin; al
    // pasar su hora de fin se marca FINALIZADA y se pide calificar a ambos.
    setInterval(() => { this.finalizarReunionesVencidas().catch(() => {}); }, 60_000);
  }

  private async finalizarReunionesVencidas() {
    const ahora = new Date();
    const vencidas = await this.prisma.reunion.findMany({
      where: { estaActivo: 1, estadoReunion: 'EN_CURSO', fechaHoraFinReunion: { lte: ahora } },
      select: { id: true },
    });
    for (const r of vencidas) {
      await this.prisma.reunion.update({
        where: { id: r.id },
        data: { estadoReunion: 'FINALIZADA', creadoModificadoFecha: new Date() },
      });
      await this.notificarParaCalificar(r.id);
    }
  }

  private async enviarRecordatoriosReuniones() {
    const ahora = new Date();
    const limite = new Date(ahora.getTime() + 15 * 60000);
    const proximas = await this.prisma.reunion.findMany({
      where: {
        estaActivo: 1,
        estadoReunion: { in: ['PROGRAMADA', 'REPROGRAMADA'] },
        seEnvioNotificacionDeRetraso: 0,
        fechaHoraInicioReunion: { gte: ahora, lte: limite },
      },
      include: {
        mesa: { select: { numeroMesa: true } },
        solicitudreunion: {
          include: {
            empresaevento_solicitudreunion_empresaEvento_idToempresaevento: { include: { empresa: { select: { nombre: true } } } },
            empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento: { include: { empresa: { select: { nombre: true } } } },
          },
        },
      },
    });

    for (const r of proximas) {
      const sol = (r as any).solicitudreunion;
      const nombreA = sol?.empresaevento_solicitudreunion_empresaEvento_idToempresaevento?.empresa?.nombre ?? 'la otra empresa';
      const nombreB = sol?.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento?.empresa?.nombre ?? 'la otra empresa';
      const hora = new Date(r.fechaHoraInicioReunion).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
      const mesa = (r as any).mesa ? ` en la Mesa ${(r as any).mesa.numeroMesa}` : '';

      await this.notificar(sol.empresaEvento_id, 'reunion:recordatorio', 'Reunión próxima',
        `Tu reunión con ${nombreB} comienza a las ${hora}${mesa}. ¡No llegues tarde!`, r.id, 'reunion');
      await this.notificar(sol.empresaEventorReceptora_id, 'reunion:recordatorio', 'Reunión próxima',
        `Tu reunión con ${nombreA} comienza a las ${hora}${mesa}. ¡No llegues tarde!`, r.id, 'reunion');

      await this.prisma.reunion.update({
        where: { id: r.id },
        data: { seEnvioNotificacionDeRetraso: 1 },
      });
    }
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

    let esResponsable: boolean | undefined;
    if (user.rolEvento === 'EMPRESA') {
      const eventoId = await this.getPrincipalEventoId();
      const eu = await this.prisma.empresa_usuario.findFirst({
        where: { usuario_id: user.id, estaActivo: 1, empresaevento: { evento_id: eventoId ?? undefined } },
      });
      esResponsable = eu?.esResponsable === 1;
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
      ...(esResponsable !== undefined && { esResponsable }),
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

  // Credencial digital pública — la abre quien escanea el QR (técnico/admin/empresa).
  // Muestra que el participante y su empresa están registrados y habilitados.
  @Get('public/credencial/:euId')
  async getCredencialPublica(@Param('euId') euId: string, @Query('t') token: string) {
    const id = Number(euId);
    if (!id) throw new BadRequestException('Credencial inválida');
    if (!token || token !== this.credencialToken(id))
      throw new BadRequestException('Credencial inválida o alterada');

    const eu: any = await this.prisma.empresa_usuario.findUnique({
      where: { id },
      include: {
        usuario: { select: { nombres: true, apellidoPaterno: true, apellidoMaterno: true, urlFotoPerfil: true } },
        empresa: { include: { ciudad: { include: { pais: true } } } },
        empresaevento: { include: { evento: { select: { nombre: true, edicion: true, fechaInicioEvento: true, fechaFinEvento: true, urlLogoEvento: true, ciudadEvento: true, paisEvento: true } } } },
      },
    });
    if (!eu) throw new BadRequestException('Credencial no encontrada');

    const ee = eu.empresaevento;
    const habilitado = ee?.estadoHabilitacionAcceso === 'HABILITADO' && ee?.estadoVerificacionPago === 'COMPLETADO';
    return {
      valida: true,
      habilitado,
      participante: {
        nombre: `${eu.usuario.nombres} ${eu.usuario.apellidoPaterno}${eu.usuario.apellidoMaterno ? ' ' + eu.usuario.apellidoMaterno : ''}`.trim(),
        urlFotoPerfil: eu.usuario.urlFotoPerfil || null,
        cargo: eu.cargo || null,
        esResponsable: eu.esResponsable === 1,
      },
      empresa: {
        nombre: eu.empresa.nombre,
        codigo: eu.empresa.codigo || null,
        rubro: eu.empresa.rubro || null,
        urlFotoPerfil: eu.empresa.urlFotoPerfil || null,
        ciudad: eu.empresa.ciudad?.nombre ?? null,
        pais: eu.empresa.ciudad?.pais?.nombre ?? null,
      },
      evento: {
        nombre: ee?.evento?.nombre ?? null,
        edicion: ee?.evento?.edicion ?? null,
        fechaInicio: ee?.evento?.fechaInicioEvento ?? null,
        fechaFin: ee?.evento?.fechaFinEvento ?? null,
        urlLogoEvento: ee?.evento?.urlLogoEvento ?? null,
        ciudad: ee?.evento?.ciudadEvento ?? null,
        pais: ee?.evento?.paisEvento ?? null,
      },
      tipoParticipacion: ee?.tipoParticipacion ?? null,
    };
  }

  // Regenera las credenciales QR de todos los participantes habilitados con el
  // nuevo formato (URL escaneable). Idempotente; se llama una vez tras el deploy.
  @Post('admin/regenerar-credenciales')
  async regenerarCredenciales() {
    const eventoId = await this.getPrincipalEventoId();
    if (!eventoId) return { ok: false, regeneradas: 0 };
    const eus = await this.prisma.empresa_usuario.findMany({
      where: {
        estaActivo: 1,
        empresaevento: { evento_id: eventoId, estaActivo: 1, estadoHabilitacionAcceso: 'HABILITADO', estadoVerificacionPago: 'COMPLETADO' },
      },
      include: { empresa: { select: { codigo: true } }, usuario: { select: { nombres: true, apellidoPaterno: true } } },
    });
    let n = 0;
    for (const eu of eus) {
      try {
        await this.generarCredencialQR(eu.id, (eu as any).empresa?.codigo ?? '', `${(eu as any).usuario?.nombres} ${(eu as any).usuario?.apellidoPaterno}`);
        n++;
      } catch {}
    }
    return { ok: true, regeneradas: n };
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
      participantes: (ee.empresa_usuario ?? []).map((eu: any) => ({
        nombres: eu.usuario?.nombres,
        apellidoPaterno: eu.usuario?.apellidoPaterno,
        correo: eu.usuario?.correo,
        cargo: eu.cargo,
        esResponsable: eu.esResponsable === 1,
      })),
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
        oferta: body.empresa.oferta || null,
        demanda: body.empresa.demanda || null,
        interesesBusqueda: body.empresa.interesesBusqueda || null,
        estaActivo: 1,
      },
    });
    if (!empresaExistente) await this.asegurarCodigoEmpresa(empresa.id, null, empresa.nombre);

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

  // Info pública del evento principal — usada por la web para el favicon y el título.
  @Get('evento-principal')
  async getEventoPrincipalPublico() {
    const eventoId = await this.getPrincipalEventoId();
    if (!eventoId) return { nombre: null, urlLogoEvento: null };
    const ev = await this.prisma.evento.findUnique({
      where: { id: eventoId },
      select: { nombre: true, urlLogoEvento: true },
    });
    return { nombre: ev?.nombre ?? null, urlLogoEvento: ev?.urlLogoEvento ?? null };
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
      include: { eventoreglaqr: { where: { estadoActivo: 1 }, orderBy: { rangoDesde: 'asc' } } },
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
      fechaInicioSolicitudes: body.fechaInicioSolicitudes ? new Date(body.fechaInicioSolicitudes) : null,
      fechaFinSolicitudes: body.fechaFinSolicitudes ? new Date(body.fechaFinSolicitudes) : null,
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
        // Eliminación lógica: se desactivan las reglas anteriores y se crean las nuevas
        await this.prisma.eventoreglaqr.updateMany({
          where: { evento_id: eventId, estadoActivo: 1 },
          data: { estadoActivo: 0, fechaModificacion: new Date() },
        });
        if (reglasQR.length > 0) {
          await this.prisma.eventoreglaqr.createMany({
            data: this.sanitizeReglasQR(reglasQR).map((r) => ({ ...r, evento_id: eventId })),
          });
        }
      }

      return await this.prisma.evento.findUnique({
        where: { id: eventId },
        include: { eventoreglaqr: { where: { estadoActivo: 1 }, orderBy: { rangoDesde: 'asc' } } },
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
        codigo: e.codigo,
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

    const codigoEmpresa = await this.asegurarCodigoEmpresa((ee as any).empresa.id, (ee as any).empresa.codigo);

    for (const eu of (ee as any).empresa_usuario.filter((e: any) => e.estaActivo !== 0)) {
      const u = eu.usuario;
      const pwd = generarPasswordTemporal();
      const hashed = await bcrypt.hash(pwd, 10);
      await this.prisma.usuario.update({
        where: { id: u.id },
        data: { contrasenia: hashed, creadoModificadoFecha: new Date() },
      });

      let qrUrl = '';
      try {
        qrUrl = await this.generarCredencialQR(eu.id, codigoEmpresa, `${u.nombres} ${u.apellidoPaterno}`);
      } catch (qrErr) {
        console.warn(`[WARN] No se pudo generar credencial QR para euId=${eu.id}:`, qrErr instanceof Error ? qrErr.message : qrErr);
      }

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
                  <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;width:110px">Código empresa</td><td style="padding:6px 0;font-weight:700;color:#111827">${codigoEmpresa}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280;font-size:13px">Correo</td><td style="padding:6px 0;font-weight:700;color:#111827">${u.correo}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280;font-size:13px">Contraseña</td><td style="padding:6px 0;font-weight:700;color:#111827;font-size:18px;letter-spacing:2px">${pwd}</td></tr>
                </table>
              </div>
              ${qrUrl ? `
              <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:20px;margin-bottom:20px;text-align:center">
                <p style="color:#6b7280;font-size:13px;margin:0 0 12px;font-weight:600;text-transform:uppercase;letter-spacing:.5px">Tu credencial digital</p>
                <img src="${qrUrl}" alt="Código QR de acceso" width="180" height="180" style="border-radius:8px" />
                <p style="color:#9ca3af;font-size:11px;margin:10px 0 0">Preséntala en el evento. También la encontrarás en tu perfil.</p>
              </div>` : ''}
              <p style="color:#9ca3af;font-size:12px;margin:0">Por seguridad, te recomendamos cambiar tu contraseña después del primer inicio de sesión.</p>
            </div>
          `,
        });
      } catch (emailErr) {
        console.warn(`[WARN] No se pudo enviar email a ${u.correo}:`, emailErr instanceof Error ? emailErr.message : emailErr);
        console.log(`[DEV] Credenciales para ${u.correo} — contraseña: ${pwd}`);
      }
    }

    await this.notificar((ee as any).id, 'pago:aprobado', 'Pago aprobado',
      'Tu pago de inscripción fue aprobado. ¡Ya tienes acceso al evento!');
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

    await this.notificar((ee as any).id, 'pago:rechazado', 'Pago rechazado',
      `Tu comprobante de pago fue rechazado. Motivo: ${(body as any).motivo}`);
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

      const noticia = await this.prisma.noticia.create({
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
      if (body.estadoPublicacion === 'PUBLICADO' || !body.estadoPublicacion) {
        this.notifGateway.emitirGlobal('comunicado:nuevo', {
          mensaje: `Nuevo comunicado: ${body.tituloNoticia}`,
          titulo: body.tituloNoticia,
        });
      }
      return noticia;
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

    // Solicitudes PENDIENTES con mesa elegida: la mesa queda "pre-reservada"
    // para que el administrador vea la intención aunque aún no se acepte.
    const solicitudesPendientes = await this.prisma.solicitudreunion.findMany({
      where: {
        estaActivo: 1,
        estadoSolicitud: 'PENDIENTE',
        mesa_id: { gt: 0 },
        empresaevento_solicitudreunion_empresaEvento_idToempresaevento: { evento_id: eventoId },
      },
      include: {
        empresaevento_solicitudreunion_empresaEvento_idToempresaevento: { include: { empresa: { select: { nombre: true } } } },
        empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento: { include: { empresa: { select: { nombre: true } } } },
      },
    });
    const pendientesPorMesa = new Map<number, any[]>();
    for (const s of solicitudesPendientes) {
      if (!s.mesa_id) continue;
      const arr = pendientesPorMesa.get(s.mesa_id) ?? [];
      arr.push({
        solicitudId: s.id,
        inicio: s.fechaHoraInicioPropuesta,
        fin: s.fechaHoraFinPropuesta,
        solicitante: (s as any).empresaevento_solicitudreunion_empresaEvento_idToempresaevento?.empresa?.nombre ?? '—',
        receptora: (s as any).empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento?.empresa?.nombre ?? '—',
      });
      pendientesPorMesa.set(s.mesa_id, arr);
    }

    const mesasConEstado = mesas.map((m) => {
      let estadoMesa = this.computeEstadoMesa(m.reunion);
      const solicitudesEnEspera = pendientesPorMesa.get(m.id) ?? [];
      if (estadoMesa === 'LIBRE' && solicitudesEnEspera.length > 0) estadoMesa = 'PRE_RESERVADA';
      const reunionActual =
        m.reunion.find((r: any) => r.estadoReunion === 'EN_CURSO') ||
        m.reunion.find((r: any) => r.estadoReunion === 'PROGRAMADA' || r.estadoReunion === 'REPROGRAMADA') ||
        null;
      return { ...m, estadoMesa, reunionActual, solicitudesEnEspera };
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

      // Credenciales generadas por el sistema y enviadas al correo del técnico
      const pwd = generarPasswordTemporal();
      const hashed = await bcrypt.hash(pwd, 10);
      const tecnico = await this.prisma.usuario.create({
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

      const evento = await this.prisma.evento.findUnique({ where: { id: eventoId }, select: { nombre: true, edicion: true } });
      const isDevEmail = !process.env.MAIL_USER || process.env.MAIL_USER === 'tu_correo@gmail.com';
      let correoEnviado = false;
      if (!isDevEmail) {
        try {
          const transporter = createMailTransporter();
          await transporter.sendMail({
            from: process.env.MAIL_FROM,
            to: body.correo,
            subject: `Tus credenciales de Técnico — ${evento?.nombre ?? 'Rueda de Negocios'}`,
            html: `
              <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:12px">
                <h2 style="color:#449D3A;margin-bottom:4px">¡Bienvenido/a al equipo técnico!</h2>
                <p style="color:#374151;margin-bottom:20px">
                  Hola <strong>${body.nombres} ${body.apellidoPaterno}</strong>, fuiste registrado/a como técnico
                  del evento <strong>${evento?.nombre ?? 'Rueda de Negocios'} ${evento?.edicion ?? ''}</strong>.
                </p>
                <div style="background:#fff;border:2px solid #bbf7d0;border-radius:10px;padding:20px;margin-bottom:20px">
                  <p style="color:#166534;font-size:13px;margin:0 0 8px;font-weight:700;text-transform:uppercase">Tus credenciales de acceso:</p>
                  <p style="color:#374151;font-size:14px;margin:0 0 4px"><strong>Correo:</strong> ${body.correo}</p>
                  <p style="color:#374151;font-size:14px;margin:0"><strong>Contraseña:</strong> <code style="background:#f0fdf4;padding:2px 8px;border-radius:6px;font-size:15px">${pwd}</code></p>
                </div>
                <p style="color:#6b7280;font-size:13px;margin:0">
                  Ingresa al sistema con estas credenciales. Por seguridad, te recomendamos cambiar tu contraseña desde tu perfil.
                </p>
              </div>
            `,
          });
          correoEnviado = true;
        } catch (emailErr) {
          console.warn(`[WARN] No se pudo enviar credenciales a ${body.correo}:`, emailErr instanceof Error ? emailErr.message : emailErr);
        }
      }
      if (!correoEnviado) {
        console.log('\n╔══════════════════════════════════════════════════════╗');
        console.log('║  [DEV] CREDENCIALES DE TÉCNICO (email no enviado)     ║');
        console.log(`║  Correo    : ${body.correo}`);
        console.log(`║  Contraseña: ${pwd}`);
        console.log('╚══════════════════════════════════════════════════════╝\n');
      }

      return { ...tecnico, correoEnviado };
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
      reunionesCanceladas,
      reunionesReprogramadas,
      acuerdosRegistrados,
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
      this.prisma.reunion.count({ where: { ...ef, estaActivo: 1, estadoReunion: 'CANCELADA' } }),
      this.prisma.reunion.count({ where: { ...ef, estaActivo: 1, estadoReunion: 'REPROGRAMADA' } }),
      eventoId
        ? this.prisma.resultadoreunion.count({ where: { estaActivo: 1, reunion: { evento_id: eventoId, estaActivo: 1 } } })
        : Promise.resolve(0),
      this.prisma.empresaevento.count({ where: { ...ef, estadoVerificacionPago: 'COMPLETADO', estaActivo: 1 } }),
      this.prisma.empresaevento.count({ where: { ...ef, estadoVerificacionPago: 'PENDIENTE', estaActivo: 1 } }),
      this.prisma.empresaevento.count({ where: { ...ef, estadoVerificacionPago: 'OBSERVADO', estaActivo: 1 } }),
      eventoId ? this.prisma.mesa.count({ where: { evento_id: eventoId, estaActivo: 1 } }) : Promise.resolve(0),
      eventoId ? this.prisma.mesa.count({ where: { evento_id: eventoId, estaActivo: 0 } }) : Promise.resolve(0),
      eventoId ? this.prisma.actividadprograma.count({ where: { evento_id: eventoId, estaActivo: 1 } }) : Promise.resolve(0),
    ]);

    // Top 5 empresas con más reuniones (no canceladas)
    const reunionesConEmpresas = eventoId
      ? await this.prisma.reunion.findMany({
          where: { evento_id: eventoId, estaActivo: 1, estadoReunion: { not: 'CANCELADA' } },
          select: {
            solicitudreunion: {
              select: {
                empresaevento_solicitudreunion_empresaEvento_idToempresaevento: { select: { id: true, empresa: { select: { nombre: true } } } },
                empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento: { select: { id: true, empresa: { select: { nombre: true } } } },
              },
            },
          },
        })
      : [];
    const conteoEmpresas = new Map<number, { nombre: string; total: number }>();
    for (const r of reunionesConEmpresas) {
      const sol = (r as any).solicitudreunion;
      for (const ee of [
        sol?.empresaevento_solicitudreunion_empresaEvento_idToempresaevento,
        sol?.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento,
      ]) {
        if (!ee) continue;
        const prev = conteoEmpresas.get(ee.id);
        conteoEmpresas.set(ee.id, { nombre: ee.empresa?.nombre ?? '—', total: (prev?.total ?? 0) + 1 });
      }
    }
    const topEmpresas = [...conteoEmpresas.values()].sort((a, b) => b.total - a.total).slice(0, 5);

    const reunionesTotal = reunionesProgramadas + reunionesFinalizadas + reunionesEnCurso + reunionesReprogramadas;
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
        acuerdosRegistrados,
        pagosVerificados,
        pagosPendientes,
        mesasHabilitadas: mesasActivas,
        eventosInternos,
      },
      reunionesPorEstado: {
        programadas: reunionesProgramadas,
        enCurso: reunionesEnCurso,
        finalizadas: reunionesFinalizadas,
        canceladas: reunionesCanceladas,
        reprogramadas: reunionesReprogramadas,
        total: reunionesTotal,
      },
      topEmpresas,
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

  // ─── REPORTES ────────────────────────────────────────────────────────────────
  // Filas planas listas para tabla / exportación CSV, siempre acotadas al evento principal.
  @Get('admin/reportes')
  async getReportes(@Query('tipo') tipo: string) {
    const eventoId = await this.getPrincipalEventoId();
    if (!eventoId) return { tipo, filas: [] };

    if (tipo === 'empresas') {
      const ees = await this.prisma.empresaevento.findMany({
        where: { evento_id: eventoId, estaActivo: 1 },
        include: {
          empresa: { include: { ciudad: { include: { pais: true } } } },
          empresa_usuario: { where: { estaActivo: 1 } },
        },
        orderBy: { fechaCreacion: 'asc' },
      });
      return {
        tipo,
        filas: ees.map((ee: any) => ({
          Empresa: ee.empresa.nombre,
          Rubro: ee.empresa.rubro,
          Ciudad: ee.empresa.ciudad?.nombre ?? '—',
          Pais: ee.empresa.ciudad?.pais?.nombre ?? '—',
          Participantes: ee.empresa_usuario.length,
          CuposPagados: ee.numeroParticipantes,
          EstadoPago: ee.estadoVerificacionPago,
          Acceso: ee.estadoHabilitacionAcceso,
          FechaRegistro: ee.fechaCreacion?.toISOString().slice(0, 10) ?? '—',
        })),
      };
    }

    if (tipo === 'reuniones') {
      const reuniones = await this.prisma.reunion.findMany({
        where: { evento_id: eventoId, estaActivo: 1 },
        include: this.reunionInclude(),
        orderBy: { fechaHoraInicioReunion: 'asc' },
      });
      return {
        tipo,
        filas: reuniones.map((r: any) => {
          const sol = r.solicitudreunion;
          return {
            Fecha: r.fechaHoraInicioReunion?.toISOString().slice(0, 10) ?? '—',
            HoraInicio: new Date(r.fechaHoraInicioReunion).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }),
            HoraFin: new Date(r.fechaHoraFinReunion).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }),
            EmpresaSolicitante: sol?.empresaevento_solicitudreunion_empresaEvento_idToempresaevento?.empresa?.nombre ?? '—',
            EmpresaReceptora: sol?.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento?.empresa?.nombre ?? '—',
            Tipo: r.tipoReunion,
            Mesa: r.mesa?.numeroMesa ?? '—',
            Estado: r.estadoReunion,
          };
        }),
      };
    }

    if (tipo === 'resultados') {
      const resultados = await this.prisma.resultadoreunion.findMany({
        where: { estaActivo: 1, reunion: { evento_id: eventoId, estaActivo: 1 } },
        include: {
          reunion: { select: { fechaHoraInicioReunion: true, mesa: { select: { numeroMesa: true } } } },
          empresaevento_resultadoreunion_empresaeventoCalificadora_idToempresaevento: { select: { empresa: { select: { nombre: true } } } },
          empresaevento_resultadoreunion_empresaeventoCalificada_idToempresaevento: { select: { empresa: { select: { nombre: true } } } },
          empresa_usuario: { include: { usuario: { select: { nombres: true, apellidoPaterno: true } } } },
        },
        orderBy: { fechaCreacion: 'desc' },
      });
      return {
        tipo,
        filas: resultados.map((res: any) => ({
          FechaReunion: res.reunion?.fechaHoraInicioReunion?.toISOString().slice(0, 10) ?? '—',
          Mesa: res.reunion?.mesa?.numeroMesa ?? '—',
          EmpresaCalificadora: res.empresaevento_resultadoreunion_empresaeventoCalificadora_idToempresaevento?.empresa?.nombre ?? '—',
          EmpresaCalificada: res.empresaevento_resultadoreunion_empresaeventoCalificada_idToempresaevento?.empresa?.nombre ?? '—',
          Calificacion: `${res.calificacionReunion}/5`,
          RangoAcuerdo: res.rangoAcuerdoComercial ?? '—',
          Observaciones: res.observacionesPuntosTratados ?? '—',
          RegistradoPor: res.empresa_usuario?.usuario
            ? `${res.empresa_usuario.usuario.nombres} ${res.empresa_usuario.usuario.apellidoPaterno}`
            : '—',
        })),
      };
    }

    throw new BadRequestException('tipo debe ser: empresas, reuniones o resultados');
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
    if (activas.some((r: any) => r.estadoReunion === 'PROGRAMADA' || r.estadoReunion === 'REPROGRAMADA')) return 'RESERVADA';
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
        this.prisma.reunion.count({ where: { ...ef, estadoReunion: { in: ['PROGRAMADA', 'REPROGRAMADA'] }, fechaHoraInicioReunion: { gte: ahora } } }),
        this.prisma.reunion.count({ where: { ...ef, tipoReunion: { in: ['VIRTUAL', 'MIXTA'] }, estadoReunion: { not: 'CANCELADA' } } }),
        this.prisma.mesa.count({ where: { evento_id: eventoId, estaActivo: 1 } }),
        this.prisma.reunion.findMany({
          where: { ...ef, estadoReunion: { in: ['PROGRAMADA', 'REPROGRAMADA', 'EN_CURSO'] }, fechaHoraInicioReunion: { gte: ahora } },
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
    const actualizada = await this.prisma.reunion.update({
      where: { id: Number(id) },
      data: {
        estadoReunion: body.estadoReunion,
        observacionesReunion: body.observaciones ?? undefined,
        creadoModificadoFecha: new Date(),
      },
      include: this.reunionInclude(),
    });
    // El técnico/admin puede terminar la reunión en cualquier momento: al hacerlo
    // se avisa a ambas empresas para que registren el resultado.
    if (body.estadoReunion === 'FINALIZADA') {
      await this.notificarParaCalificar(Number(id));
    }
    return actualizada;
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
      .map((ee) => ({
        ...ee.empresa,
        estadoPago: ee.estadoVerificacionPago,
        empresaeventoId: ee.id,
        estadoHabilitacionAcceso: ee.estadoHabilitacionAcceso,
      }));

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

  // ── Técnico: agendar reuniones entre empresas directamente ─────────────────
  // El técnico elige dos empresas, horario y mesa; la reunión se crea ya
  // confirmada (solicitud ACEPTADA + reunión PROGRAMADA) y se notifica a ambas.

  @Get('tecnico/empresas-habilitadas')
  async getTecnicoEmpresasHabilitadas() {
    const eventoId = await this.getPrincipalEventoId();
    if (!eventoId) return [];
    const ees = await this.prisma.empresaevento.findMany({
      where: {
        evento_id: eventoId,
        estaActivo: 1,
        estadoVerificacionPago: 'COMPLETADO',
        estadoHabilitacionAcceso: 'HABILITADO',
      },
      include: { empresa: { select: { nombre: true, codigo: true, rubro: true, urlFotoPerfil: true } } },
      orderBy: { empresa: { nombre: 'asc' } },
    });
    return ees.map((ee) => ({
      eeId: ee.id,
      nombre: ee.empresa.nombre,
      codigo: ee.empresa.codigo,
      rubro: ee.empresa.rubro,
      urlFotoPerfil: ee.empresa.urlFotoPerfil,
    }));
  }

  @Post('tecnico/reuniones/crear')
  async tecnicoCrearReunion(@Body() body: any) {
    const { eeAId, eeBId, tipo, inicio, mesaId, enlace, mensaje } = body;
    if (!eeAId || !eeBId || !tipo || !inicio)
      throw new BadRequestException('Campos requeridos: eeAId, eeBId, tipo, inicio');
    if (Number(eeAId) === Number(eeBId)) throw new BadRequestException('Elige dos empresas distintas');

    const eventoId = await this.getPrincipalEventoId();
    const evento = eventoId ? await this.prisma.evento.findUnique({ where: { id: eventoId } }) : null;
    if (!evento) throw new BadRequestException('No hay un evento activo');

    await this.verificarEE(Number(eeAId));
    await this.verificarEE(Number(eeBId));

    const iniDate = new Date(inicio);
    const finDate = new Date(iniDate.getTime() + evento.duracionReunion * 60000);

    // Conflictos de agenda de ambas empresas
    for (const eeCheck of [Number(eeAId), Number(eeBId)]) {
      const conflicto = await this.prisma.reunion.findFirst({
        where: {
          estaActivo: 1,
          estadoReunion: { not: 'CANCELADA' },
          fechaHoraInicioReunion: { lt: finDate },
          fechaHoraFinReunion: { gt: iniDate },
          solicitudreunion: { OR: [{ empresaEvento_id: eeCheck }, { empresaEventorReceptora_id: eeCheck }] },
        },
      });
      if (conflicto)
        throw new BadRequestException('Una de las empresas ya tiene una reunión en ese horario. Elige otro horario.');
    }

    // Mesa: la elegida por el técnico o una automática balanceada
    let mesaAsignada: number | null = mesaId ? Number(mesaId) : null;
    if (!mesaAsignada) {
      mesaAsignada = await this.elegirMesaBalanceada(eventoId!, iniDate, finDate);
      if (!mesaAsignada) throw new BadRequestException('No hay mesas disponibles para ese horario');
    } else {
      const ocupada = await this.prisma.reunion.findFirst({
        where: {
          mesa_id: mesaAsignada,
          estaActivo: 1,
          estadoReunion: { not: 'CANCELADA' },
          fechaHoraInicioReunion: { lt: finDate },
          fechaHoraFinReunion: { gt: iniDate },
        },
      });
      if (ocupada) throw new BadRequestException('La mesa seleccionada ya está ocupada en ese horario');
    }

    // La solicitud queda firmada por el encargado de la primera empresa
    const responsableA = await this.prisma.empresa_usuario.findFirst({
      where: { empresaevento_id: Number(eeAId), esResponsable: 1, estaActivo: 1 },
    });
    if (!responsableA) throw new BadRequestException('La primera empresa no tiene un encargado registrado');

    const sol = await this.prisma.solicitudreunion.create({
      data: {
        empresaEvento_id: Number(eeAId),
        empresaEventorReceptora_id: Number(eeBId),
        empresa_usuarioResponsableSolicitud: responsableA.id,
        tipoReunion: tipo,
        enlaceReunionVirtual: tipo === 'VIRTUAL' ? enlace || null : null,
        fechaHoraInicioPropuesta: iniDate,
        fechaHoraFinPropuesta: finDate,
        mensajeParaEmpresaReceptora: mensaje?.trim() || 'Reunión agendada por el equipo técnico del evento',
        estadoSolicitud: 'ACEPTADA',
        mesa_id: mesaAsignada,
        estaActivo: 1,
      },
    });
    const reunion = await this.prisma.reunion.create({
      data: {
        solicitudReunion_id: sol.id,
        mesa_id: mesaAsignada,
        evento_id: eventoId!,
        tipoReunion: tipo,
        fechaHoraInicioReunion: iniDate,
        fechaHoraFinReunion: finDate,
        estadoReunion: 'PROGRAMADA',
        seEnvioNotificacionDeRetraso: 0,
        cantidadAsistentesRegistrados: 0,
        estaActivo: 1,
      },
    });

    const cuando = this.fmtSlotAsistente(iniDate.toISOString());
    for (const ee of [Number(eeAId), Number(eeBId)]) {
      await this.notificar(
        ee,
        'reunion:agendada',
        'Reunión agendada por el evento',
        `El equipo técnico agendó una reunión para el ${cuando}. Revisa los detalles en Reuniones.`,
        reunion.id,
        'reunion',
      );
    }
    return { ok: true, reunionId: reunion.id, inicio: iniDate.toISOString(), fin: finDate.toISOString() };
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
        usuario: { select: { id: true, nombres: true, apellidoPaterno: true, apellidoMaterno: true, correo: true, telefono: true, rolEvento: true, urlFotoPerfil: true } },
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
    const start = new Date(evento.fechaInicioEvento);
    const end = new Date(evento.fechaFinEvento);
    // Anclar la grilla a la medianoche local del día de inicio, no al timestamp
    // exacto de fechaInicioEvento: así los slots caen en minutos "redondos"
    // (ej. :00/:30 para reuniones de 30 min) en vez de heredar un minuto
    // arbitrario del evento (ej. :42/:12), que confundía al elegir horario.
    const midnight = new Date(start);
    midnight.setHours(0, 0, 0, 0);
    const offsetMs = start.getTime() - midnight.getTime();
    let current = new Date(midnight.getTime() + Math.ceil(offsetMs / intervalMs) * intervalMs);
    while (current.getTime() + durMs <= end.getTime()) {
      slots.push({ inicio: new Date(current), fin: new Date(current.getTime() + durMs) });
      current = new Date(current.getTime() + intervalMs);
    }
    return slots;
  }

  // Candidatos de inicio de reunión cada 5 minutos dentro de la ventana del evento.
  // A diferencia de generarFranjas (grilla fija duración+descanso, usada por la
  // pantalla "Mis horarios"), esto ofrece TODA la disponibilidad al solicitar una
  // reunión: cualquier inicio en minuto múltiplo de 5 cuya reunión completa quepa
  // en el evento. Los choques con reuniones/bloqueos se filtran por solapamiento.
  private generarCandidatosInicio(evento: any): { inicio: Date; fin: Date }[] {
    const PASO_MS = 5 * 60000;
    const durMs = evento.duracionReunion * 60000;
    const start = new Date(evento.fechaInicioEvento);
    const end = new Date(evento.fechaFinEvento);
    const midnight = new Date(start);
    midnight.setHours(0, 0, 0, 0);
    const offsetMs = start.getTime() - midnight.getTime();
    let current = new Date(midnight.getTime() + Math.ceil(offsetMs / PASO_MS) * PASO_MS);
    const slots: { inicio: Date; fin: Date }[] = [];
    while (current.getTime() + durMs <= end.getTime()) {
      slots.push({ inicio: new Date(current), fin: new Date(current.getTime() + durMs) });
      current = new Date(current.getTime() + PASO_MS);
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
        codigo: eu.empresa.codigo, oferta: eu.empresa.oferta, demanda: eu.empresa.demanda,
        interesesBusqueda: eu.empresa.interesesBusqueda,
      },
      esResponsable: eu.esResponsable === 1,
      urlCredencialQR: (eu as any).urlCredencialQR ?? null,
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

  // Rubros complementarios para la recomendación de reuniones (reglas simples de afinidad).
  // Afinidad ALTA = mismo rubro; MEDIA = rubro complementario según este mapa (se evalúa en ambas direcciones).
  private static readonly RUBROS_COMPLEMENTARIOS: Record<string, string[]> = {
    'Agropecuario y Ganadería':        ['Transporte y Logística', 'Industria y Manufactura', 'Comercio y Distribución', 'Tecnología e Innovación', 'Medio Ambiente y Energía', 'Gastronomía y Turismo'],
    'Comercio y Distribución':         ['Transporte y Logística', 'Industria y Manufactura', 'Agropecuario y Ganadería', 'Gastronomía y Turismo', 'Artesanía y Cultura', 'Finanzas y Seguros'],
    'Construcción e Infraestructura':  ['Inmobiliario', 'Minería e Hidrocarburos', 'Finanzas y Seguros', 'Transporte y Logística', 'Medio Ambiente y Energía'],
    'Educación y Capacitación':        ['Tecnología e Innovación', 'Servicios Profesionales', 'Salud y Bienestar', 'Artesanía y Cultura'],
    'Finanzas y Seguros':              ['Servicios Profesionales', 'Comercio y Distribución', 'Construcción e Infraestructura', 'Inmobiliario'],
    'Gastronomía y Turismo':           ['Agropecuario y Ganadería', 'Artesanía y Cultura', 'Transporte y Logística', 'Comercio y Distribución'],
    'Industria y Manufactura':         ['Comercio y Distribución', 'Transporte y Logística', 'Agropecuario y Ganadería', 'Minería e Hidrocarburos'],
    'Minería e Hidrocarburos':         ['Construcción e Infraestructura', 'Transporte y Logística', 'Medio Ambiente y Energía', 'Industria y Manufactura'],
    'Salud y Bienestar':               ['Educación y Capacitación', 'Servicios Profesionales', 'Tecnología e Innovación'],
    'Servicios Profesionales':         ['Finanzas y Seguros', 'Tecnología e Innovación', 'Educación y Capacitación', 'Inmobiliario'],
    'Tecnología e Innovación':         ['Agropecuario y Ganadería', 'Educación y Capacitación', 'Salud y Bienestar', 'Servicios Profesionales', 'Comercio y Distribución', 'Finanzas y Seguros'],
    'Transporte y Logística':          ['Agropecuario y Ganadería', 'Comercio y Distribución', 'Industria y Manufactura', 'Gastronomía y Turismo', 'Minería e Hidrocarburos'],
    'Artesanía y Cultura':             ['Gastronomía y Turismo', 'Comercio y Distribución', 'Educación y Capacitación'],
    'Medio Ambiente y Energía':        ['Agropecuario y Ganadería', 'Minería e Hidrocarburos', 'Construcción e Infraestructura', 'Tecnología e Innovación'],
    'Inmobiliario':                    ['Construcción e Infraestructura', 'Finanzas y Seguros', 'Servicios Profesionales'],
  };

  private calcularAfinidad(miRubro: string | null, otroRubro: string | null): 'alta' | 'media' | null {
    if (!miRubro || !otroRubro) return null;
    if (miRubro === otroRubro) return 'alta';
    const directa = AppController.RUBROS_COMPLEMENTARIOS[miRubro]?.includes(otroRubro);
    const inversa = AppController.RUBROS_COMPLEMENTARIOS[otroRubro]?.includes(miRubro);
    return directa || inversa ? 'media' : null;
  }

  // Directorio único de empresas participantes: ver perfil (oferta, demanda,
  // contacto, código) y, si el usuario es encargado, solicitar reunión.
  // Admite filtros de oferta/demanda/lugar. Ordenado por afinidad (alta > media
  // > sin afinidad) y luego nombre, para que los encargados vean primero a las
  // empresas más relevantes al decidir con quién reunirse.
  @Get('empresa/directorio')
  async getDirectorioParticipantes(
    @Query('eeId') eeId: string,
    @Query('oferta') oferta?: string,
    @Query('demanda') demanda?: string,
    @Query('lugar') lugar?: string,
  ) {
    if (!eeId) throw new BadRequestException('eeId requerido');
    const eventoId = await this.getPrincipalEventoId();
    if (!eventoId) return [];

    const [miEe, ees] = await Promise.all([
      this.prisma.empresaevento.findUnique({ where: { id: Number(eeId) }, include: { empresa: true } }),
      this.prisma.empresaevento.findMany({
        where: {
          evento_id: eventoId,
          estaActivo: 1,
          estadoVerificacionPago: 'COMPLETADO',
          estadoHabilitacionAcceso: 'HABILITADO',
          id: { not: Number(eeId) },
          empresa: {
            ...(oferta ? { oferta: { contains: oferta, mode: 'insensitive' } } : {}),
            ...(demanda ? { demanda: { contains: demanda, mode: 'insensitive' } } : {}),
            ...(lugar
              ? { ciudad: { OR: [{ nombre: { contains: lugar, mode: 'insensitive' } }, { pais: { nombre: { contains: lugar, mode: 'insensitive' } } }] } }
              : {}),
          },
        },
        include: { empresa: { include: { ciudad: { include: { pais: true } } } } },
      }),
    ]);

    const miRubro = miEe?.empresa?.rubro ?? null;
    const mapped = ees.map((ee) => ({
      empresaeventoId: ee.id,
      empresaId: ee.empresa_id,
      codigo: ee.empresa.codigo,
      nombre: ee.empresa.nombre,
      rubro: ee.empresa.rubro,
      descripcion: ee.empresa.descripcion,
      oferta: ee.empresa.oferta,
      demanda: ee.empresa.demanda,
      urlFotoPerfil: ee.empresa.urlFotoPerfil,
      sitioWeb: ee.empresa.sitioWeb,
      urlPdf: ee.empresa.urlPdf,
      correoCorporativo: ee.empresa.correoCorporativo,
      telefonoWhatsapp: ee.empresa.telefonoWhatsapp,
      ciudad: ee.empresa.ciudad?.nombre ?? null,
      pais: ee.empresa.ciudad?.pais?.nombre ?? null,
      tipoParticipacion: ee.tipoParticipacion,
      afinidad: this.calcularAfinidad(miRubro, ee.empresa.rubro),
    }));
    const peso = { alta: 2, media: 1 } as Record<string, number>;
    return mapped.sort((a, b) => {
      const pa = a.afinidad ? peso[a.afinidad] : 0;
      const pb = b.afinidad ? peso[b.afinidad] : 0;
      if (pa !== pb) return pb - pa;
      return (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es');
    });
  }

  // Perfil completo de UNA empresa participante, para la vista dedicada de perfil
  // (separada de la solicitud de reunión). Incluye afinidad respecto al que mira.
  @Get('empresa/perfil-empresa/:eeId')
  async getPerfilEmpresaDetalle(@Param('eeId') eeId: string, @Query('miEeId') miEeId?: string) {
    const id = Number(eeId);
    if (!id) throw new BadRequestException('eeId requerido');
    const ee: any = await this.prisma.empresaevento.findUnique({
      where: { id },
      include: {
        empresa: { include: { ciudad: { include: { pais: true } } } },
        empresa_usuario: {
          where: { estaActivo: 1 },
          include: { usuario: { select: { nombres: true, apellidoPaterno: true } } },
        },
      },
    });
    if (!ee) throw new BadRequestException('Empresa no encontrada');

    let miRubro: string | null = null;
    if (miEeId) {
      const miEe = await this.prisma.empresaevento.findUnique({
        where: { id: Number(miEeId) }, include: { empresa: { select: { rubro: true } } },
      });
      miRubro = miEe?.empresa?.rubro ?? null;
    }
    const encargado = ee.empresa_usuario?.find((eu: any) => eu.esResponsable === 1)?.usuario ?? null;

    return {
      empresaeventoId: ee.id,
      codigo: ee.empresa.codigo,
      nombre: ee.empresa.nombre,
      rubro: ee.empresa.rubro,
      descripcion: ee.empresa.descripcion,
      oferta: ee.empresa.oferta,
      demanda: ee.empresa.demanda,
      interesesBusqueda: ee.empresa.interesesBusqueda,
      urlFotoPerfil: ee.empresa.urlFotoPerfil,
      sitioWeb: ee.empresa.sitioWeb,
      urlPdf: ee.empresa.urlPdf,
      correoCorporativo: ee.empresa.correoCorporativo,
      telefonoWhatsapp: ee.empresa.telefonoWhatsapp,
      ciudad: ee.empresa.ciudad?.nombre ?? null,
      pais: ee.empresa.ciudad?.pais?.nombre ?? null,
      tipoParticipacion: ee.tipoParticipacion,
      numeroParticipantes: ee.numeroParticipantes,
      encargado: encargado ? `${encargado.nombres} ${encargado.apellidoPaterno}` : null,
      afinidad: this.calcularAfinidad(miRubro, ee.empresa.rubro),
    };
  }

  // Coincidencia simple por palabras clave (>=4 letras, sin tildes) entre dos textos.
  private hayCoincidenciaTexto(a: string | null | undefined, b: string | null | undefined): boolean {
    if (!a || !b) return false;
    const normalizar = (s: string) =>
      s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9]+/).filter((w) => w.length >= 4);
    const setA = new Set(normalizar(a));
    const palabrasB = normalizar(b);
    return palabrasB.some((w) => setA.has(w));
  }

  // Oportunidades: empresas cuyo interés declarado coincide con mi rubro, o cuya
  // oferta/demanda tiene palabras en común con mi demanda/oferta. Reglas simples
  // (sin IA), pensado como apoyo para decidir con quién conviene reunirse.
  @Get('empresa/oportunidades')
  async getOportunidades(@Query('eeId') eeId: string) {
    if (!eeId) throw new BadRequestException('eeId requerido');
    const eventoId = await this.getPrincipalEventoId();
    if (!eventoId) return [];

    const miEe = await this.prisma.empresaevento.findUnique({ where: { id: Number(eeId) }, include: { empresa: true } });
    if (!miEe) return [];
    const mi = miEe.empresa;

    const ees = await this.prisma.empresaevento.findMany({
      where: {
        evento_id: eventoId, estaActivo: 1,
        estadoVerificacionPago: 'COMPLETADO', estadoHabilitacionAcceso: 'HABILITADO',
        id: { not: Number(eeId) },
      },
      include: { empresa: { include: { ciudad: { include: { pais: true } } } } },
    });

    const resultados = ees
      .map((ee) => {
        const otra = ee.empresa;
        const motivos: string[] = [];
        if (otra.interesesBusqueda && this.hayCoincidenciaTexto(otra.interesesBusqueda, mi.rubro)) {
          motivos.push(`Busca empresas del rubro "${mi.rubro}"`);
        }
        if (mi.interesesBusqueda && this.hayCoincidenciaTexto(mi.interesesBusqueda, otra.rubro)) {
          motivos.push(`Coincide con tu interés declarado`);
        }
        if (this.hayCoincidenciaTexto(otra.oferta, mi.demanda)) motivos.push('Su oferta coincide con lo que buscas');
        if (this.hayCoincidenciaTexto(otra.demanda, mi.oferta)) motivos.push('Busca lo que tu empresa ofrece');
        if (motivos.length === 0 && this.calcularAfinidad(mi.rubro, otra.rubro) === 'alta') {
          motivos.push('Mismo rubro que tu empresa');
        }
        return { ee, motivos };
      })
      .filter((r) => r.motivos.length > 0)
      .map(({ ee, motivos }) => ({
        empresaeventoId: ee.id,
        empresaId: ee.empresa_id,
        codigo: ee.empresa.codigo,
        nombre: ee.empresa.nombre,
        rubro: ee.empresa.rubro,
        oferta: ee.empresa.oferta,
        demanda: ee.empresa.demanda,
        urlFotoPerfil: ee.empresa.urlFotoPerfil,
        ciudad: ee.empresa.ciudad?.nombre ?? null,
        pais: ee.empresa.ciudad?.pais?.nombre ?? null,
        motivos,
      }))
      .sort((a, b) => b.motivos.length - a.motivos.length);

    return resultados;
  }

  // ── Asistente virtual rule-based ─────────────────────────────────────────────
  @Post('empresa/asistente')
  async asistente(@Body() body: { eeId: number; euId?: number; mensaje: string; contexto?: any }) {
    const { eeId, mensaje = '' } = body;
    if (!eeId) throw new BadRequestException('eeId requerido');
    const msg = mensaje.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

    const eventoId = await this.getPrincipalEventoId();
    if (!eventoId) return { respuesta: 'No hay un evento activo en este momento.' };
    const evento = await this.prisma.evento.findUnique({ where: { id: eventoId } });
    if (!evento) return { respuesta: 'No hay un evento activo en este momento.' };

    const fmtFecha = (d: Date | null) =>
      d ? new Date(d).toLocaleDateString('es-BO', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : '—';
    const fmtHora = (d: Date | null) =>
      d ? new Date(d).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }) : '—';

    // ── agendar reunión (flujo multi-paso) ───────────────────────────────────
    const respAgendar = await this.asistenteAgendarReunion(Number(eeId), body.euId, msg, body.contexto, eventoId);
    if (respAgendar) return respAgendar;

    // ── próxima reunión ──────────────────────────────────────────────────────
    if (/reunion|reunione|siguiente|proxim|cuando me reun/i.test(msg)) {
      const ahora = new Date();
      const reunion = await this.prisma.reunion.findFirst({
        where: {
          evento_id: eventoId, estaActivo: 1,
          estadoReunion: { in: ['PROGRAMADA', 'REPROGRAMADA', 'EN_CURSO'] },
          solicitudreunion: { OR: [{ empresaEvento_id: eeId }, { empresaEventorReceptora_id: eeId }] },
          fechaHoraInicioReunion: { gte: ahora },
        },
        orderBy: { fechaHoraInicioReunion: 'asc' },
        include: {
          mesa: true,
          solicitudreunion: {
            include: {
              empresaevento_solicitudreunion_empresaEvento_idToempresaevento: { include: { empresa: true } },
              empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento: { include: { empresa: true } },
            },
          },
        },
      });
      if (!reunion) return { respuesta: 'No tienes reuniones programadas próximamente.' };
      const sr = (reunion as any).solicitudreunion;
      const contraparteEmpresa = sr.empresaEvento_id === eeId
        ? sr.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento?.empresa
        : sr.empresaevento_solicitudreunion_empresaEvento_idToempresaevento?.empresa;
      const contraparte = contraparteEmpresa?.nombre ?? 'desconocida';
      const mesaNum = (reunion as any).mesa ? `Mesa ${(reunion as any).mesa.numeroMesa}` : 'por confirmar';
      return {
        respuesta: `Tu próxima reunión es el ${fmtFecha(reunion.fechaHoraInicioReunion)} a las ${fmtHora(reunion.fechaHoraInicioReunion)} con ${contraparte}. ${mesaNum}. Estado: ${reunion.estadoReunion}.`,
      };
    }

    // ── mesa asignada ────────────────────────────────────────────────────────
    if (/mesa|donde|lugar/i.test(msg)) {
      const reuniones = await this.prisma.reunion.findMany({
        where: {
          evento_id: eventoId, estaActivo: 1,
          estadoReunion: { in: ['PROGRAMADA', 'REPROGRAMADA', 'EN_CURSO'] },
          solicitudreunion: { OR: [{ empresaEvento_id: eeId }, { empresaEventorReceptora_id: eeId }] },
          mesa_id: { gt: 0 },
        },
        include: { mesa: true },
        orderBy: { fechaHoraInicioReunion: 'asc' },
      });
      if (reuniones.length === 0) return { respuesta: 'Aún no tienes mesas asignadas para reuniones próximas.' };
      const mesas = [...new Set(reuniones.map((r) => (r as any).mesa ? `Mesa ${(r as any).mesa.numeroMesa}` : null).filter(Boolean))];
      return { respuesta: `Tus reuniones próximas se llevarán a cabo en: ${mesas.join(', ')}.` };
    }

    // ── mapa / recinto ───────────────────────────────────────────────────────
    if (/mapa|recinto|ubicacion|donde es|donde esta/i.test(msg)) {
      if ((evento as any).urlImagenMapaRecinto) {
        return { respuesta: `Aquí tienes el mapa del recinto.`, imageUrl: (evento as any).urlImagenMapaRecinto };
      }
      return { respuesta: 'El mapa del recinto aún no está disponible. Consulta con el administrador.' };
    }

    // ── cronograma / charlas ─────────────────────────────────────────────────
    if (/cronograma|charla|conferencia|programa|agenda/i.test(msg)) {
      if ((evento as any).urlImagenCronogramaCharlas) {
        return { respuesta: 'Aquí tienes el cronograma de charlas del evento.', imageUrl: (evento as any).urlImagenCronogramaCharlas };
      }
      return { respuesta: 'El cronograma de charlas aún no está disponible.' };
    }

    // ── fecha / horario del evento ───────────────────────────────────────────
    if (/fecha|cuando|horario|inicio|fin del evento/i.test(msg)) {
      const ini = fmtFecha(evento.fechaInicioEvento);
      const fin = fmtFecha(evento.fechaFinEvento);
      return { respuesta: `El evento "${evento.nombre}" se realiza desde el ${ini} hasta el ${fin}.` };
    }

    // ── estado de pago / monto ───────────────────────────────────────────────
    if (/pago|monto|inscripcion|precio|cuanto cuesta|cuanto es/i.test(msg)) {
      const ee = await this.prisma.empresaevento.findUnique({ where: { id: eeId } });
      const estado = ee?.estadoVerificacionPago ?? 'PENDIENTE';
      const monto = (evento as any).montoBaseIncripcionBolivianos;
      const estadoTexto: Record<string, string> = {
        COMPLETADO: 'aprobado',
        PENDIENTE: 'pendiente de verificación',
        RECHAZADO: 'rechazado',
        OBSERVADO: 'observado — revisar comentarios',
      };
      return {
        respuesta: `Estado de tu pago de inscripción: ${estadoTexto[estado] ?? estado}. Monto base: Bs. ${monto ?? '—'}.`,
      };
    }

    // ── solicitudes pendientes ───────────────────────────────────────────────
    if (/solicitud|pedido|pendiente/i.test(msg)) {
      const pendientes = await this.prisma.solicitudreunion.count({
        where: {
          estaActivo: 1,
          estadoSolicitud: 'PENDIENTE',
          OR: [{ empresaEvento_id: eeId }, { empresaEventorReceptora_id: eeId }],
        },
      });
      return {
        respuesta: pendientes > 0
          ? `Tienes ${pendientes} solicitud(es) de reunión pendiente(s). Revísalas en la sección Solicitudes.`
          : 'No tienes solicitudes de reunión pendientes.',
      };
    }

    // ── cupos / participantes ────────────────────────────────────────────────
    if (/cupo|participante|slot|espacio/i.test(msg)) {
      const ee = await this.prisma.empresaevento.findUnique({ where: { id: eeId } });
      if (!ee) return { respuesta: 'No se pudo obtener información de cupos.' };
      const usados = await this.prisma.empresa_usuario.count({
        where: { empresaevento_id: eeId, estaActivo: 1 },
      });
      const total = ee.numeroParticipantes ?? 0;
      const disponibles = total - usados;
      return {
        respuesta: `Tienes ${usados} participante(s) registrado(s) de ${total} cupo(s) totales. Cupos disponibles: ${Math.max(0, disponibles)}.`,
      };
    }

    // ── ayuda / comando no reconocido ────────────────────────────────────────
    return {
      respuesta: `Hola! Puedo ayudarte con:\n• Agendar una reunión con otra empresa\n• Tu próxima reunión\n• Mesa asignada\n• Fecha y horario del evento\n• Estado de tu pago\n• Mapa del recinto\n• Cronograma de charlas\n• Solicitudes pendientes\n• Cupos disponibles\n\n¿Sobre qué te puedo informar?`,
    };
  }

  private fmtSlotAsistente(iso: string) {
    const d = new Date(iso);
    const fecha = d.toLocaleDateString('es-BO', { weekday: 'short', day: '2-digit', month: '2-digit' });
    const hora = d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
    return `${fecha} ${hora}`;
  }

  // Flujo conversacional para agendar reuniones desde el asistente.
  // Stateless en el servidor: el estado del diálogo viaja en `contexto` (round-trip con el cliente)
  // y la creación final pasa por crearSolicitud(), que re-valida todo.
  private async asistenteAgendarReunion(
    eeId: number,
    euId: number | undefined,
    msg: string,
    contexto: any,
    eventoId: number,
  ): Promise<{ respuesta: string; contexto?: any; opciones?: string[] } | null> {
    const enFlujo = contexto?.flujo === 'agendar';
    const quiereAgendar =
      /(agendar|programar|solicitar|pedir)\s+(una\s+|otra\s+)?reunion/.test(msg) || /reunion con\s+\S+/.test(msg);
    if (!enFlujo && !quiereAgendar) return null;

    const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

    if (enFlujo && /cancelar|salir|olvidalo|dejalo|ya no/.test(msg)) {
      return { respuesta: 'Listo, cancelé el agendamiento. ¿Te ayudo con algo más?', contexto: null };
    }

    // Solo el encargado puede agendar
    if (!euId) {
      return { respuesta: 'Para agendar reuniones necesito identificar tu cuenta. Cierra sesión y vuelve a entrar, luego intenta de nuevo.', contexto: null };
    }
    const eu = await this.prisma.empresa_usuario.findFirst({
      where: { id: Number(euId), empresaevento_id: eeId, estaActivo: 1 },
    });
    if (!eu || eu.esResponsable !== 1) {
      return { respuesta: 'Solo el encargado de tu empresa puede agendar reuniones. Pídele a tu encargado que envíe la solicitud.', contexto: null };
    }

    const buscarEmpresas = (term: string) =>
      this.prisma.empresaevento.findMany({
        where: {
          evento_id: eventoId,
          estaActivo: 1,
          estadoVerificacionPago: 'COMPLETADO',
          estadoHabilitacionAcceso: 'HABILITADO',
          id: { not: eeId },
          empresa: { nombre: { contains: term, mode: 'insensitive' } },
        },
        include: { empresa: { select: { nombre: true } } },
        take: 6,
        orderBy: { empresa: { nombre: 'asc' } },
      });

    const presentarHorarios = async (receptoraEeId: number, receptoraNombre: string) => {
      const disp: any = await this.getHorariosDisponibles(String(eeId), String(receptoraEeId));
      const todos: any[] = disp.horarios ?? [];
      // Sugerencias variadas: máximo una por hora (la disponibilidad ahora es cada
      // 5 min, y ofrecer 08:00/08:05/08:10... no ayuda a elegir). Prefiere minutos
      // redondos; el usuario igual puede escribir cualquier hora exacta disponible.
      const porHora = new Map<string, any>();
      for (const h of todos) {
        const d = new Date(h.inicio);
        const clave = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;
        const previa = porHora.get(clave);
        if (!previa || (new Date(previa.inicio).getMinutes() !== 0 && d.getMinutes() === 0)) {
          porHora.set(clave, h);
        }
      }
      const slots: string[] = [...porHora.values()].slice(0, 6).map((h: any) => h.inicio);
      if (slots.length === 0) {
        return {
          respuesta: `${receptoraNombre} no tiene horarios disponibles por ahora. Intenta más tarde o escribe el nombre de otra empresa.`,
          contexto: { flujo: 'agendar', paso: 'empresa' },
        };
      }
      const horarioOpciones = slots.map((s) => this.fmtSlotAsistente(s));
      const lista = horarioOpciones.map((o, i) => `${i + 1}. ${o}`).join('\n');
      return {
        respuesta: `Estos son los horarios disponibles con ${receptoraNombre}:\n${lista}\n\nResponde con el número o toca una opción.`,
        contexto: { flujo: 'agendar', paso: 'horario', receptoraEeId, receptoraNombre, slots, horarioOpciones, duracionMin: disp.duracionMinutos },
        opciones: horarioOpciones,
      };
    };

    const procesarBusqueda = async (term: string) => {
      const encontradas: any[] = await buscarEmpresas(term);
      if (encontradas.length === 0) {
        return {
          respuesta: `No encontré ninguna empresa habilitada que se llame "${term}". Escribe otro nombre o "cancelar".`,
          contexto: { flujo: 'agendar', paso: 'empresa' },
        };
      }
      if (encontradas.length === 1) {
        return presentarHorarios(encontradas[0].id, encontradas[0].empresa.nombre);
      }
      return {
        respuesta: `Encontré varias empresas:\n${encontradas.map((e, i) => `${i + 1}. ${e.empresa.nombre}`).join('\n')}\n\n¿Cuál eliges? Responde con el número o el nombre.`,
        contexto: {
          flujo: 'agendar', paso: 'empresa',
          candidatos: encontradas.map((e) => ({ id: e.id, nombre: e.empresa.nombre })),
        },
        opciones: encontradas.map((e) => e.empresa.nombre),
      };
    };

    // ── inicio del flujo ─────────────────────────────────────────────────────
    if (!enFlujo) {
      const matchCon = msg.match(/reunion con\s+(.+)$/);
      const term = matchCon?.[1]?.trim();
      if (!term) {
        return {
          respuesta: '¡Claro! ¿Con qué empresa quieres agendar la reunión? Escribe su nombre (o "cancelar" para salir).',
          contexto: { flujo: 'agendar', paso: 'empresa' },
        };
      }
      return procesarBusqueda(term);
    }

    // ── pasos del flujo en curso ─────────────────────────────────────────────
    const paso = contexto.paso;

    if (paso === 'empresa') {
      const candidatos: { id: number; nombre: string }[] = contexto.candidatos ?? [];
      if (candidatos.length > 0) {
        const idx = parseInt(msg, 10);
        let elegido = !isNaN(idx) ? candidatos[idx - 1] : undefined;
        if (!elegido) elegido = candidatos.find((c) => msg.includes(norm(c.nombre)) || norm(c.nombre).includes(msg.trim()));
        if (!elegido) {
          return {
            respuesta: 'No entendí cuál empresa. Responde con el número de la lista, el nombre exacto, o "cancelar".',
            contexto,
            opciones: candidatos.map((c) => c.nombre),
          };
        }
        return presentarHorarios(elegido.id, elegido.nombre);
      }
      return procesarBusqueda(msg.trim());
    }

    if (paso === 'horario') {
      const slots: string[] = contexto.slots ?? [];
      const horarioOpciones: string[] = contexto.horarioOpciones ?? [];
      let iso: string | undefined;

      // 1) Coincidencia exacta contra la opción mostrada/tocada por el usuario
      //    (evita el mismatch 12h/24h: comparamos texto contra texto, no contra Date.getHours()).
      const msgNorm = msg.trim().toLowerCase();
      const exactIdx = horarioOpciones.findIndex((o) => o.toLowerCase() === msgNorm);
      if (exactIdx !== -1) iso = slots[exactIdx];

      // 2) Índice numérico de la lista
      if (!iso) {
        const idx = parseInt(msg, 10);
        if (!isNaN(idx) && slots[idx - 1]) iso = slots[idx - 1];
      }

      // 3) Último recurso: regex hh:mm, consciente de am/pm
      if (!iso) {
        const m = msg.match(/(\d{1,2})[:.](\d{2})\s*(a\.?\s*m\.?|p\.?\s*m\.?)?/i);
        if (m) {
          let hh = parseInt(m[1], 10);
          const mm = m[2];
          const ampm = m[3]?.toLowerCase().replace(/[.\s]/g, '');
          if (ampm === 'pm' && hh < 12) hh += 12;
          if (ampm === 'am' && hh === 12) hh = 0;
          const hhmm = `${String(hh).padStart(2, '0')}:${mm}`;
          iso = slots.find((s) => {
            const d = new Date(s);
            return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` === hhmm;
          });
        }
      }

      if (!iso) {
        return {
          respuesta: 'No reconocí ese horario. Responde con el número de la lista (ej: 1) o toca una opción.',
          contexto,
          opciones: horarioOpciones,
        };
      }
      return {
        respuesta: `Perfecto: ${this.fmtSlotAsistente(iso)} con ${contexto.receptoraNombre}. ¿La reunión será presencial o virtual?`,
        contexto: { ...contexto, paso: 'tipo', inicio: iso },
        opciones: ['Presencial', 'Virtual'],
      };
    }

    if (paso === 'tipo') {
      const tipo = /virtual/.test(msg) ? 'VIRTUAL' : /presencial/.test(msg) ? 'PRESENCIAL' : null;
      if (!tipo) {
        return { respuesta: '¿La reunión será presencial o virtual?', contexto, opciones: ['Presencial', 'Virtual'] };
      }
      if (tipo === 'VIRTUAL') {
        return {
          respuesta: `Resumen de tu solicitud:\n• Empresa: ${contexto.receptoraNombre}\n• Horario: ${this.fmtSlotAsistente(contexto.inicio)}\n• Tipo: Virtual\n\n¿Envío la solicitud?`,
          contexto: { ...contexto, paso: 'confirmar', tipo, mesaId: null },
          opciones: ['Sí, enviar', 'No, cancelar'],
        };
      }

      // PRESENCIAL: ofrecer selección de mesa
      const finDate = new Date(new Date(contexto.inicio).getTime() + (Number(contexto.duracionMin) || 20) * 60000);
      const mesasDisp: any[] = await this.getMesasDisponiblesEmpresa(contexto.inicio, finDate.toISOString());
      const mesas = mesasDisp.slice(0, 8).map((m: any) => ({ id: m.id, numeroMesa: m.numeroMesa }));
      const AUTOMATICA = 'Cualquiera / Automática';
      const mesaOpciones = [...mesas.map((m) => `Mesa ${m.numeroMesa}`), AUTOMATICA];

      if (mesas.length === 0) {
        return {
          respuesta: `No encontré mesas libres para ese horario en este momento, pero puedo intentar asignarte una automáticamente al confirmar.\n\nResumen de tu solicitud:\n• Empresa: ${contexto.receptoraNombre}\n• Horario: ${this.fmtSlotAsistente(contexto.inicio)}\n• Tipo: Presencial\n• Mesa: se asignará automáticamente\n\n¿Envío la solicitud?`,
          contexto: { ...contexto, paso: 'confirmar', tipo, mesaId: null },
          opciones: ['Sí, enviar', 'No, cancelar'],
        };
      }
      return {
        respuesta: `¿En qué mesa prefieres la reunión presencial?\n${mesaOpciones.map((o, i) => `${i + 1}. ${o}`).join('\n')}`,
        contexto: { ...contexto, paso: 'mesa', tipo, mesas, mesaOpciones },
        opciones: mesaOpciones,
      };
    }

    if (paso === 'mesa') {
      const mesas: { id: number; numeroMesa: number }[] = contexto.mesas ?? [];
      const mesaOpciones: string[] = contexto.mesaOpciones ?? [];
      const AUTOMATICA = 'Cualquiera / Automática';
      let elegidoIdx: number | undefined;

      // 1) Coincidencia exacta contra la opción mostrada/tocada
      const msgNorm = msg.trim().toLowerCase();
      const exactIdx = mesaOpciones.findIndex((o) => o.toLowerCase() === msgNorm);
      if (exactIdx !== -1) elegidoIdx = exactIdx;

      // 2) Índice numérico de la lista
      if (elegidoIdx === undefined) {
        const idx = parseInt(msg, 10);
        if (!isNaN(idx) && mesaOpciones[idx - 1]) elegidoIdx = idx - 1;
      }

      // 3) Último recurso: "mesa N" o "automática/cualquiera" en texto libre
      let mesaId: number | null | undefined;
      if (elegidoIdx !== undefined) {
        mesaId = mesaOpciones[elegidoIdx] === AUTOMATICA ? null : mesas.find((m) => `Mesa ${m.numeroMesa}` === mesaOpciones[elegidoIdx])?.id;
      } else if (/automat|cualquiera/i.test(msg)) {
        mesaId = null;
      } else {
        const m = msg.match(/mesa\s*(\d+)/i);
        if (m) mesaId = mesas.find((x) => x.numeroMesa === parseInt(m[1], 10))?.id;
      }

      if (mesaId === undefined) {
        return {
          respuesta: 'No reconocí esa mesa. Responde con el número de la lista o toca una opción.',
          contexto,
          opciones: mesaOpciones,
        };
      }
      const mesaTexto = mesaId === null ? 'se asignará automáticamente' : `Mesa ${mesas.find((m) => m.id === mesaId)?.numeroMesa}`;
      return {
        respuesta: `Resumen de tu solicitud:\n• Empresa: ${contexto.receptoraNombre}\n• Horario: ${this.fmtSlotAsistente(contexto.inicio)}\n• Tipo: Presencial\n• Mesa: ${mesaTexto}\n\n¿Envío la solicitud?`,
        contexto: { ...contexto, paso: 'confirmar', mesaId },
        opciones: ['Sí, enviar', 'No, cancelar'],
      };
    }

    if (paso === 'confirmar') {
      if (/(^|\s)no(\s|$|,)/.test(msg) || /cancelar/.test(msg)) {
        return { respuesta: 'Solicitud cancelada. ¿Te ayudo con algo más?', contexto: null };
      }
      if (!/(^|\s)(si|sii+|confirmo|enviar|dale|ok|listo)(\s|$|,)/.test(msg)) {
        return { respuesta: 'Responde "sí" para enviar la solicitud o "no" para cancelar.', contexto, opciones: ['Sí, enviar', 'No, cancelar'] };
      }
      const iniDate = new Date(contexto.inicio);
      const finDate = new Date(iniDate.getTime() + (Number(contexto.duracionMin) || 20) * 60000);
      try {
        await this.crearSolicitud({
          eeId,
          eeReceptoraId: contexto.receptoraEeId,
          euId,
          tipo: contexto.tipo,
          inicio: contexto.inicio,
          fin: finDate.toISOString(),
          mesaId: contexto.mesaId ?? undefined,
          mensaje: 'Solicitud enviada desde el asistente virtual',
        });
        return {
          respuesta: `✅ ¡Listo! Envié la solicitud de reunión a ${contexto.receptoraNombre} para el ${this.fmtSlotAsistente(contexto.inicio)}. Te avisaré cuando respondan; puedes ver el estado en la sección Solicitudes.`,
          contexto: null,
        };
      } catch (e: any) {
        return {
          respuesta: `No pude crear la solicitud: ${e?.message ?? 'error desconocido'}. Escribe "agendar reunión" para intentar con otro horario.`,
          contexto: null,
        };
      }
    }

    // Contexto desconocido: reiniciar el flujo
    return {
      respuesta: '¿Con qué empresa quieres agendar la reunión? Escribe su nombre.',
      contexto: { flujo: 'agendar', paso: 'empresa' },
    };
  }

  // ── Notificaciones persistentes (campanita) ─────────────────────────────────
  @Get('empresa/notificaciones')
  async getNotificacionesEmpresa(@Query('eeId') eeId: string) {
    if (!eeId) throw new BadRequestException('eeId requerido');
    const notifs = await this.prisma.notificacion.findMany({
      where: { empresaevento_id: Number(eeId), estaActivo: 1 },
      orderBy: { fechaCreacion: 'desc' },
      take: 30,
    });
    const noLeidas = await this.prisma.notificacion.count({
      where: { empresaevento_id: Number(eeId), estaActivo: 1, haSidoLeida: 0 },
    });
    return {
      noLeidas,
      notificaciones: notifs.map((n) => ({
        id: n.id,
        titulo: n.tituloNotificacion,
        mensaje: n.mensajeNotificacion,
        tipo: n.tipoNotificacion,
        leida: n.haSidoLeida === 1,
        fecha: n.fechaCreacion,
      })),
    };
  }

  @Put('empresa/notificaciones/leidas')
  async marcarNotificacionesLeidas(@Body() body: { eeId: number }) {
    if (!body.eeId) throw new BadRequestException('eeId requerido');
    await this.prisma.notificacion.updateMany({
      where: { empresaevento_id: Number(body.eeId), estaActivo: 1, haSidoLeida: 0 },
      data: { haSidoLeida: 1, creadoModificadoFecha: new Date() },
    });
    return { ok: true };
  }

  // ── Mensajería entre empresas ───────────────────────────────────────────────

  @Get('empresa/mensajes/conversaciones')
  async getConversaciones(@Query('eeId') eeId: string) {
    if (!eeId) throw new BadRequestException('eeId requerido');
    const id = Number(eeId);
    const msgs = await this.prisma.mensajeempresa.findMany({
      where: { estaActivo: 1, OR: [{ emisorEe_id: id }, { receptorEe_id: id }] },
      orderBy: { fechaCreacion: 'desc' },
    });
    // Agrupar por contraparte: último mensaje + cantidad de no leídos
    const porContraparte = new Map<number, { ultimo: any; noLeidos: number }>();
    for (const m of msgs) {
      const otro = m.emisorEe_id === id ? m.receptorEe_id : m.emisorEe_id;
      if (!porContraparte.has(otro)) porContraparte.set(otro, { ultimo: m, noLeidos: 0 });
      if (m.receptorEe_id === id && m.haSidoLeido === 0) porContraparte.get(otro)!.noLeidos++;
    }
    const ids = [...porContraparte.keys()];
    const ees = ids.length
      ? await this.prisma.empresaevento.findMany({
          where: { id: { in: ids } },
          include: { empresa: { select: { nombre: true, urlFotoPerfil: true, codigo: true } } },
        })
      : [];
    const empresaPorEe = new Map(ees.map((e) => [e.id, e.empresa]));
    return ids
      .map((otro) => {
        const { ultimo, noLeidos } = porContraparte.get(otro)!;
        const esStaff = otro === 0; // emisorEe_id 0 = equipo del evento (admin/técnico)
        const emp = empresaPorEe.get(otro);
        return {
          eeId: otro,
          nombre: esStaff ? 'Equipo del evento' : (emp?.nombre ?? 'Empresa'),
          codigo: esStaff ? null : (emp?.codigo ?? null),
          urlFotoPerfil: esStaff ? null : (emp?.urlFotoPerfil ?? null),
          esStaff,
          ultimoMensaje: ultimo.contenido,
          esMio: ultimo.emisorEe_id === id,
          fecha: ultimo.fechaCreacion,
          noLeidos,
        };
      })
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }

  @Get('empresa/mensajes')
  async getMensajes(@Query('eeId') eeId: string, @Query('otroEeId') otroEeId: string) {
    if (!eeId || !otroEeId) throw new BadRequestException('eeId y otroEeId requeridos');
    const a = Number(eeId);
    const b = Number(otroEeId);
    // Al abrir la conversación, los mensajes entrantes quedan leídos
    await this.prisma.mensajeempresa.updateMany({
      where: { emisorEe_id: b, receptorEe_id: a, haSidoLeido: 0, estaActivo: 1 },
      data: { haSidoLeido: 1, creadoModificadoFecha: new Date() },
    });
    const msgs = await this.prisma.mensajeempresa.findMany({
      where: {
        estaActivo: 1,
        OR: [
          { emisorEe_id: a, receptorEe_id: b },
          { emisorEe_id: b, receptorEe_id: a },
        ],
      },
      orderBy: { fechaCreacion: 'asc' },
      take: 200,
    });
    const euIds = [...new Set(msgs.map((m) => m.empresa_usuario_id).filter((x): x is number => !!x))];
    const eus = euIds.length
      ? await this.prisma.empresa_usuario.findMany({
          where: { id: { in: euIds } },
          include: { usuario: { select: { nombres: true, apellidoPaterno: true } } },
        })
      : [];
    const autorPorEu = new Map(eus.map((e) => [e.id, `${e.usuario.nombres} ${e.usuario.apellidoPaterno}`]));
    return msgs.map((m) => {
      // Mensajes del equipo del evento: mostrar el nombre/rol del staff que escribió.
      const autorStaff = m.remitenteRol
        ? `${m.remitenteNombre ?? 'Equipo del evento'} · ${m.remitenteRol === 'ADMIN' ? 'Organización' : 'Técnico'}`
        : null;
      return {
        id: m.id,
        esMio: m.emisorEe_id === a,
        esStaff: m.emisorEe_id === 0,
        contenido: m.contenido,
        autor: autorStaff ?? (m.empresa_usuario_id ? autorPorEu.get(m.empresa_usuario_id) ?? null : null),
        fecha: m.fechaCreacion,
      };
    });
  }

  @Post('empresa/mensajes')
  async enviarMensajeEmpresa(@Body() body: { eeId: number; euId: number; receptorEeId: number; contenido: string }) {
    const { eeId, euId, receptorEeId, contenido } = body;
    if (!eeId || !euId || !receptorEeId || !contenido?.trim())
      throw new BadRequestException('eeId, euId, receptorEeId y contenido son requeridos');
    if (Number(eeId) === Number(receptorEeId))
      throw new BadRequestException('No puedes enviarte mensajes a tu propia empresa');
    if (Number(receptorEeId) === 0)
      throw new BadRequestException('No puedes responder a los mensajes del equipo del evento');
    const eventoId = await this.getPrincipalEventoId();
    if (!eventoId) throw new BadRequestException('No hay un evento activo');
    const eu = await this.prisma.empresa_usuario.findFirst({
      where: { id: Number(euId), empresaevento_id: Number(eeId), estaActivo: 1 },
    });
    if (!eu) throw new BadRequestException('No tienes permiso para esta empresa');
    // Solo el encargado puede enviar mensajes en nombre de la empresa.
    if (eu.esResponsable !== 1)
      throw new BadRequestException('Solo el encargado de la empresa puede enviar mensajes');
    await this.verificarEE(Number(receptorEeId));
    const msg = await this.prisma.mensajeempresa.create({
      data: {
        evento_id: eventoId,
        emisorEe_id: Number(eeId),
        receptorEe_id: Number(receptorEeId),
        empresa_usuario_id: Number(euId),
        contenido: contenido.trim().slice(0, 1000),
        haSidoLeido: 0,
        estaActivo: 1,
      },
    });
    // Aviso en tiempo real a la empresa receptora para refrescar su chat
    try {
      this.notifGateway.emitirParaEe(Number(receptorEeId), 'mensaje:nuevo', { deEeId: Number(eeId) });
    } catch {}
    return { ok: true, id: msg.id, fecha: msg.fechaCreacion };
  }

  // Admin/técnico envía un mensaje a una empresa (una sola vía). Aparece en la
  // sección Mensajes de la empresa como conversación "Equipo del evento".
  @Post('staff/mensajes')
  async enviarMensajeStaff(@Body() body: { usuarioId: number; receptorEeId: number; contenido: string }) {
    const { usuarioId, receptorEeId, contenido } = body;
    if (!usuarioId || !receptorEeId || !contenido?.trim())
      throw new BadRequestException('usuarioId, receptorEeId y contenido son requeridos');
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: Number(usuarioId) },
      select: { nombres: true, apellidoPaterno: true, rolEvento: true },
    });
    if (!usuario) throw new BadRequestException('Usuario no encontrado');
    if (usuario.rolEvento !== 'ADMINISTRADOR' && usuario.rolEvento !== 'TECNICO')
      throw new BadRequestException('Solo administradores o técnicos pueden usar esta función');
    const eventoId = await this.getPrincipalEventoId();
    if (!eventoId) throw new BadRequestException('No hay un evento activo');
    await this.verificarEE(Number(receptorEeId));

    const rol = usuario.rolEvento === 'ADMINISTRADOR' ? 'ADMIN' : 'TECNICO';
    const nombre = `${usuario.nombres} ${usuario.apellidoPaterno}`.trim();
    const msg = await this.prisma.mensajeempresa.create({
      data: {
        evento_id: eventoId,
        emisorEe_id: 0, // centinela: equipo del evento
        receptorEe_id: Number(receptorEeId),
        empresa_usuario_id: null,
        remitenteRol: rol,
        remitenteNombre: nombre,
        contenido: contenido.trim().slice(0, 1000),
        haSidoLeido: 0,
        estaActivo: 1,
      },
    });
    // Aviso en tiempo real + campanita a la empresa
    try {
      this.notifGateway.emitirParaEe(Number(receptorEeId), 'mensaje:nuevo', { deEeId: 0 });
    } catch {}
    await this.notificar(
      Number(receptorEeId),
      'mensaje:staff',
      'Mensaje del equipo del evento',
      contenido.trim().slice(0, 200),
      msg.id,
      'mensajeempresa',
    );
    return { ok: true, id: msg.id, fecha: msg.fechaCreacion };
  }

  @Get('empresa/horarios')
  async getHorariosDisponibles(
    @Query('eeId') eeId: string,
    @Query('eeReceptoraId') eeReceptoraIdRaw: string,
    @Query('excludeReunionId') excludeReunionId?: string,
    @Query('solicitudId') solicitudId?: string,
  ) {
    if (!eeId || Number.isNaN(Number(eeId))) throw new BadRequestException('eeId requerido');
    let eeReceptoraId = eeReceptoraIdRaw;
    // Al editar una solicitud, el frontend puede mandar solo el id de la solicitud;
    // aquí se deduce la empresa receptora (evita depender de que la lista traiga el id).
    if ((!eeReceptoraId || Number.isNaN(Number(eeReceptoraId))) && solicitudId) {
      const sol = await this.prisma.solicitudreunion.findUnique({
        where: { id: Number(solicitudId) },
        select: { empresaEvento_id: true, empresaEventorReceptora_id: true },
      });
      if (sol) {
        eeReceptoraId = String(sol.empresaEvento_id === Number(eeId) ? sol.empresaEventorReceptora_id : sol.empresaEvento_id);
      }
    }
    if (!eeReceptoraId || Number.isNaN(Number(eeReceptoraId)))
      throw new BadRequestException('No se pudo determinar la empresa receptora');
    const eventoId = await this.getPrincipalEventoId();
    if (!eventoId) return { duracionMinutos: 0, horarios: [] };
    const evento = await this.prisma.evento.findUnique({ where: { id: eventoId } });
    if (!evento) return { duracionMinutos: 0, horarios: [] };

    // Toda la disponibilidad real: candidatos de inicio cada 5 minutos dentro de la
    // ventana del evento (no la grilla fija duración+descanso, que solo daba 2 opciones
    // de minutos por hora). Lo ocupado se descarta por solapamiento más abajo.
    const franjas = this.generarCandidatosInicio(evento);
    if (franjas.length === 0) return { duracionMinutos: evento.duracionReunion, horarios: [] };

    const excludeId = excludeReunionId ? Number(excludeReunionId) : undefined;

    const [bloqueosA, bloqueosB, rangosReceptora] = await Promise.all([
      this.prisma.empresa_bloqueo.findMany({ where: { empresaevento_id: Number(eeId) } }),
      this.prisma.empresa_bloqueo.findMany({ where: { empresaevento_id: Number(eeReceptoraId) } }),
      this.prisma.empresa_horario.findMany({ where: { empresaevento_id: Number(eeReceptoraId) } }),
    ]);

    const reunionesA = await this.prisma.reunion.findMany({
      where: {
        evento_id: eventoId, estaActivo: 1,
        estadoReunion: { not: 'CANCELADA' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
        solicitudreunion: { OR: [{ empresaEvento_id: Number(eeId) }, { empresaEventorReceptora_id: Number(eeId) }] },
      },
      select: { fechaHoraInicioReunion: true, fechaHoraFinReunion: true },
    });
    const reunionesB = await this.prisma.reunion.findMany({
      where: {
        evento_id: eventoId, estaActivo: 1,
        estadoReunion: { not: 'CANCELADA' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
        solicitudreunion: { OR: [{ empresaEvento_id: Number(eeReceptoraId) }, { empresaEventorReceptora_id: Number(eeReceptoraId) }] },
      },
      select: { fechaHoraInicioReunion: true, fechaHoraFinReunion: true },
    });

    // Solapamiento contra reuniones existentes, respetando el descanso configurado
    // entre reuniones: una reunión existente "ocupa" su horario ± tiempoEntreReuniones.
    const bufMs = (evento.tiempoEntreReuniones ?? 0) * 60000;
    const solapaCon = (r: { fechaHoraInicioReunion: Date; fechaHoraFinReunion: Date }, ini: Date, fin: Date) =>
      r.fechaHoraInicioReunion.getTime() - bufMs < fin.getTime() &&
      r.fechaHoraFinReunion.getTime() + bufMs > ini.getTime();

    const hhmmDe = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const dentroDeRangoReceptora = (ini: Date, fin: Date) => {
      if (rangosReceptora.length === 0) return true;
      const iniHHMM = hhmmDe(ini);
      const finHHMM = hhmmDe(fin);
      // La reunión completa debe caber dentro de algún rango declarado por la receptora.
      return rangosReceptora.some((r) => iniHHMM >= r.desde_hora && finHHMM <= r.hasta_hora && iniHHMM < finHHMM);
    };

    // Bloqueos por solapamiento (no por timestamp exacto): un bloqueo guarda su
    // ventana inicio–fin, así que cualquier candidato que la toque queda descartado.
    // Esto además sobrevive a cambios posteriores en la config del evento.
    const chocaConBloqueo = (bloqueos: { inicio: Date; fin: Date }[], ini: Date, fin: Date) =>
      bloqueos.some((b) => new Date(b.inicio) < fin && new Date(b.fin) > ini);

    const disponibles = franjas.filter(
      (f) =>
        !reunionesA.some((r) => solapaCon(r, f.inicio, f.fin)) &&
        !reunionesB.some((r) => solapaCon(r, f.inicio, f.fin)) &&
        !chocaConBloqueo(bloqueosA as any, f.inicio, f.fin) &&
        !chocaConBloqueo(bloqueosB as any, f.inicio, f.fin) &&
        dentroDeRangoReceptora(f.inicio, f.fin),
    );

    return {
      duracionMinutos: evento.duracionReunion,
      horarios: disponibles.map((f) => ({ inicio: f.inicio.toISOString(), fin: f.fin.toISOString() })),
    };
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

    // Tiempo de limpieza entre reuniones en la misma mesa (lo configura el admin
    // en tiempoEntreReuniones). Una mesa solo aparece libre si no tiene otra
    // reunión que se solape con [inicio - limpieza, fin + limpieza].
    const evento = await this.prisma.evento.findUnique({ where: { id: eventoId }, select: { tiempoEntreReuniones: true } });
    const bufMs = (evento?.tiempoEntreReuniones ?? 0) * 60000;
    const iniConBuffer = new Date(iniDate.getTime() - bufMs);
    const finConBuffer = new Date(finDate.getTime() + bufMs);

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
        fechaHoraInicioReunion: { lt: finConBuffer },
        fechaHoraFinReunion: { gt: iniConBuffer },
      },
      select: { mesa_id: true },
    });
    const ocupadasIds = new Set(reunionesEnSlot.map((r) => r.mesa_id));
    return mesasUnicas
      .filter((m) => !ocupadasIds.has(m.id))
      .map((m) => ({ id: m.id, numeroMesa: m.numeroMesa, capacidadPersonas: m.capacidadPersonas }));
  }

  // ── Horarios disponibles (blocklist) ──────────────────────────────────────

  @Get('empresa/horarios-empresa/rangos')
  async getRangosHorario(@Query('eeId') eeId: string) {
    if (!eeId) throw new BadRequestException('eeId requerido');
    return this.prisma.empresa_horario.findMany({
      where: { empresaevento_id: Number(eeId) },
      orderBy: { desde_hora: 'asc' },
    });
  }

  @Post('empresa/horarios-empresa/rangos')
  async aplicarRangosHorario(@Body() body: { eeId: number; rangos: { desde: string; hasta: string }[] }) {
    const { eeId, rangos = [] } = body;
    if (!eeId) throw new BadRequestException('eeId requerido');

    // Persist ranges
    await this.prisma.empresa_horario.deleteMany({ where: { empresaevento_id: Number(eeId) } });
    for (const r of rangos) {
      await this.prisma.empresa_horario.create({
        data: { empresaevento_id: Number(eeId), desde_hora: r.desde, hasta_hora: r.hasta },
      });
    }

    // Recompute blocks: block every franja outside any saved range
    await this.prisma.empresa_bloqueo.deleteMany({ where: { empresaevento_id: Number(eeId) } });
    if (rangos.length > 0) {
      const eventoId = await this.getPrincipalEventoId();
      const evento = eventoId ? await this.prisma.evento.findUnique({ where: { id: eventoId } }) : null;
      if (evento) {
        const franjas = this.generarFranjas(evento);
        for (const f of franjas) {
          const hh = String(f.inicio.getHours()).padStart(2, '0');
          const mm = String(f.inicio.getMinutes()).padStart(2, '0');
          const hhmm = `${hh}:${mm}`;
          const dentroDeRango = rangos.some((r) => hhmm >= r.desde && hhmm < r.hasta);
          if (!dentroDeRango) {
            await this.prisma.empresa_bloqueo.create({
              data: { empresaevento_id: Number(eeId), inicio: f.inicio, fin: f.fin },
            });
          }
        }
      }
    }
    return { ok: true };
  }

  @Get('empresa/horarios-empresa')
  async getHorariosEmpresa(@Query('eeId') eeId: string) {
    if (!eeId) throw new BadRequestException('eeId requerido');
    const eventoId = await this.getPrincipalEventoId();
    if (!eventoId) return [];
    const evento = await this.prisma.evento.findUnique({ where: { id: eventoId } });
    if (!evento) return [];

    const franjas = this.generarFranjas(evento);
    const bloqueos = await this.prisma.empresa_bloqueo.findMany({
      where: { empresaevento_id: Number(eeId) },
    });

    return franjas.map((f) => {
      const inicio = f.inicio.toISOString();
      const fin = f.fin.toISOString();
      const bloqueado = bloqueos.some(
        (b) => new Date(b.inicio) < f.fin && new Date(b.fin) > f.inicio,
      );
      return { inicio, fin, disponible: !bloqueado };
    });
  }

  @Delete('empresa/horarios-empresa/todos')
  async resetHorariosEmpresa(@Query('eeId') eeId: string) {
    if (!eeId) throw new BadRequestException('eeId requerido');
    await this.prisma.empresa_bloqueo.deleteMany({ where: { empresaevento_id: Number(eeId) } });
    return { ok: true };
  }

  @Put('empresa/horarios-empresa/toggle')
  async toggleHorarioEmpresa(@Body() body: { eeId: number; inicio: string; fin: string }) {
    const { eeId, inicio, fin } = body;
    if (!eeId || !inicio || !fin) throw new BadRequestException('eeId, inicio y fin requeridos');

    const iniDate = new Date(inicio);
    const finDate = new Date(fin);
    const existing = await this.prisma.empresa_bloqueo.findFirst({
      where: { empresaevento_id: eeId, inicio: iniDate },
    });

    if (existing) {
      await this.prisma.empresa_bloqueo.delete({ where: { id: existing.id } });
      return { disponible: true };
    } else {
      await this.prisma.empresa_bloqueo.create({
        data: { empresaevento_id: eeId, inicio: iniDate, fin: finDate },
      });
      return { disponible: false };
    }
  }

  // Elige una mesa libre en el horario dado, priorizando la que menos reuniones
  // tenga asignadas en todo el evento (en vez de siempre la de número más bajo).
  // Entre empatadas, se sortea para no favorecer siempre a la misma.
  private async elegirMesaBalanceada(eventoId: number, iniDate: Date, finDate: Date): Promise<number | null> {
    // Respetar el tiempo de limpieza entre reuniones de la misma mesa.
    const evento = await this.prisma.evento.findUnique({ where: { id: eventoId }, select: { tiempoEntreReuniones: true } });
    const bufMs = (evento?.tiempoEntreReuniones ?? 0) * 60000;
    const iniConBuffer = new Date(iniDate.getTime() - bufMs);
    const finConBuffer = new Date(finDate.getTime() + bufMs);
    const [mesasLibres, conteos] = await Promise.all([
      this.prisma.mesa.findMany({
        where: {
          evento_id: eventoId,
          estaActivo: 1,
          estaHabilitada: 1,
          reunion: {
            none: {
              estaActivo: 1,
              estadoReunion: { not: 'CANCELADA' },
              fechaHoraInicioReunion: { lt: finConBuffer },
              fechaHoraFinReunion: { gt: iniConBuffer },
            },
          },
        },
        select: { id: true },
      }),
      this.prisma.reunion.groupBy({
        by: ['mesa_id'],
        where: { evento_id: eventoId, estaActivo: 1, estadoReunion: { not: 'CANCELADA' } },
        _count: { id: true },
      }),
    ]);
    if (mesasLibres.length === 0) return null;

    const usoPorMesa = new Map<number, number>(conteos.map((c) => [c.mesa_id, c._count.id]));
    const ranked = mesasLibres
      .map((m) => ({ id: m.id, uso: usoPorMesa.get(m.id) ?? 0, rnd: Math.random() }))
      .sort((a, b) => a.uso - b.uso || a.rnd - b.rnd);
    return ranked[0].id;
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
    const eventoId = await this.getPrincipalEventoId();

    // Ventana de solicitudes: si el evento define fechaInicio/FinSolicitudes, se respeta.
    const eventoCfg = eventoId
      ? await this.prisma.evento.findUnique({
          where: { id: eventoId },
          select: { fechaInicioSolicitudes: true, fechaFinSolicitudes: true },
        })
      : null;
    const ahora = new Date();
    if (eventoCfg?.fechaInicioSolicitudes && ahora < new Date(eventoCfg.fechaInicioSolicitudes)) {
      throw new BadRequestException(
        `Las solicitudes de reunión abren el ${new Date(eventoCfg.fechaInicioSolicitudes).toLocaleString('es-BO')}`,
      );
    }
    if (eventoCfg?.fechaFinSolicitudes && ahora > new Date(eventoCfg.fechaFinSolicitudes)) {
      throw new BadRequestException(
        `El plazo para solicitar reuniones cerró el ${new Date(eventoCfg.fechaFinSolicitudes).toLocaleString('es-BO')}`,
      );
    }

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

    // Para reuniones virtuales: asignar mesa automáticamente, balanceando el uso
    // entre todas las mesas libres en vez de tomar siempre la de número más bajo.
    let mesaAsignada: number | null = mesaId ? Number(mesaId) : null;

    if (!mesaAsignada) {
      mesaAsignada = await this.elegirMesaBalanceada(eventoId!, iniDate, finDate);
      if (!mesaAsignada) throw new BadRequestException('No hay mesas disponibles para ese horario');
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
        mesa_id: mesaAsignada,
        estaActivo: 1,
      },
    });

    const emisora = await this.prisma.empresaevento.findUnique({
      where: { id: Number(eeId) },
      include: { empresa: { select: { nombre: true } } },
    });
    await this.notificar(Number(eeReceptoraId), 'solicitud:nueva', 'Nueva solicitud de reunión',
      `${(emisora as any)?.empresa?.nombre ?? 'Una empresa'} te envió una solicitud de reunión. Revísala en Solicitudes.`,
      sol.id, 'solicitudreunion');

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
        mesa: { select: { id: true, numeroMesa: true } },
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
        mesa_id: s.mesa_id,
        mesa: (s as any).mesa ?? null,
        fechaCreacion: s.fechaCreacion,
        esMiSolicitud: s.empresaEvento_id === Number(eeId),
        solicitanteEeId: s.empresaEvento_id,
        receptoraEeId: s.empresaEventorReceptora_id,
        tieneConflicto,
        solicitante: (s as any).empresaevento_solicitudreunion_empresaEvento_idToempresaevento?.empresa,
        receptora: (s as any).empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento?.empresa,
        reunion: (s as any).reunion?.[0] ?? null,
      };
    }));
  }

  @Put('empresa/solicitudes/:id/editar')
  async editarSolicitudPendiente(@Param('id') id: string, @Body() body: any) {
    const { eeId, tipo, inicio, fin, mesaId, enlace, mensaje } = body;
    if (!eeId || !tipo || !inicio || !fin)
      throw new BadRequestException('eeId, tipo, inicio y fin son requeridos');
    const sol = await this.prisma.solicitudreunion.findFirst({
      where: { id: Number(id), estaActivo: 1, estadoSolicitud: 'PENDIENTE' },
    });
    if (!sol) throw new BadRequestException('Solicitud no encontrada o ya procesada');
    if (sol.empresaEvento_id !== Number(eeId))
      throw new BadRequestException('Solo la empresa que envió la solicitud puede editarla');

    const iniDate = new Date(inicio);
    const finDate = new Date(fin);
    const eventoId = await this.getPrincipalEventoId();
    let mesaAsignada = mesaId ? Number(mesaId) : null;
    if (!mesaAsignada) mesaAsignada = await this.elegirMesaBalanceada(eventoId!, iniDate, finDate);
    if (!mesaAsignada) throw new BadRequestException('No hay mesas disponibles para ese horario');
    const ocupada = await this.prisma.reunion.findFirst({
      where: {
        mesa_id: mesaAsignada, estaActivo: 1, estadoReunion: { not: 'CANCELADA' },
        fechaHoraInicioReunion: { lt: finDate }, fechaHoraFinReunion: { gt: iniDate },
      },
    });
    if (ocupada) throw new BadRequestException('La mesa seleccionada ya está ocupada');

    const actualizada = await this.prisma.solicitudreunion.update({
      where: { id: Number(id) },
      data: {
        tipoReunion: tipo, fechaHoraInicioPropuesta: iniDate, fechaHoraFinPropuesta: finDate,
        mesa_id: mesaAsignada, enlaceReunionVirtual: tipo === 'VIRTUAL' ? enlace || null : null,
        mensajeParaEmpresaReceptora: mensaje || null, creadoModificadoFecha: new Date(),
      },
    });
    await this.notificar(sol.empresaEventorReceptora_id, 'solicitud:editada', 'Solicitud actualizada',
      'La otra empresa modificó la hora o los detalles de su solicitud. Revísala nuevamente antes de aceptarla.',
      sol.id, 'solicitudreunion');
    return { ok: true, solicitud: actualizada };
  }

  @Put('empresa/solicitudes/:id/aceptar')
  async aceptarSolicitud(@Param('id') id: string, @Body() body: { eeId: number }) {
    const sol = await this.prisma.solicitudreunion.findFirst({
      where: { id: Number(id), estaActivo: 1, estadoSolicitud: 'PENDIENTE' },
    });
    if (!sol) throw new BadRequestException('Solicitud no encontrada o ya procesada');
    if (sol.empresaEventorReceptora_id !== Number(body.eeId))
      throw new BadRequestException('No tienes permiso para aceptar esta solicitud');

    const eventoId = await this.getPrincipalEventoId();
    const iniDate = sol.fechaHoraInicioPropuesta;
    const finDate = sol.fechaHoraFinPropuesta;

    // Usar la mesa que eligió la empresa solicitante al crear la solicitud
    let mesaId = sol.mesa_id ?? null;
    if (!mesaId) {
      // Fallback: auto-asignar si por algún motivo no tiene mesa (reunión virtual o error)
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
      if (!mesaLibre) throw new BadRequestException('No hay mesas disponibles para ese horario.');
      mesaId = mesaLibre.id;
    } else {
      // Verificar que la mesa elegida por el solicitante sigue libre
      const ocupada = await this.prisma.reunion.findFirst({
        where: {
          mesa_id: mesaId, estaActivo: 1, estadoReunion: { not: 'CANCELADA' },
          fechaHoraInicioReunion: { lt: finDate },
          fechaHoraFinReunion: { gt: iniDate },
        },
      });
      if (ocupada) throw new BadRequestException('La mesa elegida por la empresa solicitante ya está ocupada. Rechaza esta solicitud y solicita que elijan otro horario o mesa.');
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

    await this.notificar(sol.empresaEvento_id, 'solicitud:aceptada', 'Solicitud aceptada',
      'Tu solicitud de reunión fue aceptada. Revisa el horario en Reuniones.', reunion.id, 'reunion');
    await this.notificar(sol.empresaEventorReceptora_id, 'solicitud:aceptada', 'Reunión confirmada',
      'Aceptaste una solicitud de reunión. Revisa los detalles en Reuniones.', reunion.id, 'reunion');
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
    await this.notificar(sol.empresaEvento_id, 'solicitud:rechazada', 'Solicitud rechazada',
      `Tu solicitud de reunión fue rechazada.${body.motivo ? ' Motivo: ' + body.motivo : ''}`, sol.id, 'solicitudreunion');
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
              include: { empresa: { select: { id: true, codigo: true, nombre: true, rubro: true, urlFotoPerfil: true } } },
            },
            empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento: {
              include: { empresa: { select: { id: true, codigo: true, nombre: true, rubro: true, urlFotoPerfil: true } } },
            },
          },
        },
        resultadoreunion: {
          where: { estaActivo: 1, empresaeventoCalificadora_id: Number(eeId) },
          select: { id: true, calificacionReunion: true, rangoAcuerdoComercial: true },
        },
        cambioreunion: {
          where: { estaActivo: 1, estado: 'PENDIENTE' },
          orderBy: { fechaCreacion: 'desc' },
          take: 1,
        },
      },
      orderBy: { fechaHoraInicioReunion: 'asc' },
    });

    const mapeadas = reuniones.map((r) => {
      const sol = (r as any).solicitudreunion;
      const solicitanteEe = sol?.empresaevento_solicitudreunion_empresaEvento_idToempresaevento;
      const receptoraEe = sol?.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento;
      const yoSolicite = solicitanteEe?.id === Number(eeId);
      const contraparte = yoSolicite ? receptoraEe?.empresa : solicitanteEe?.empresa;
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
        // true = la solicité yo; false = me la solicitaron a mí
        yoSolicite,
        cambioPendiente: (r as any).cambioreunion?.[0] ?? null,
        // ee que pidió iniciar antes de la hora (para el consentimiento mutuo)
        inicioAnticipadoPor: (r as any).inicioAnticipadoPor ?? null,
      };
    });

    // Prioridad: primero las que yo solicité, luego las que me solicitaron;
    // dentro de cada grupo, orden cronológico.
    return mapeadas.sort((a, b) => {
      if (a.yoSolicite !== b.yoSolicite) return a.yoSolicite ? -1 : 1;
      return new Date(a.inicio).getTime() - new Date(b.inicio).getTime();
    });
  }

  @Put('empresa/reuniones/:id/cambiar-horario')
  async cambiarHorarioReunion(
    @Param('id') id: string,
    @Body() body: { eeId: number; inicio: string },
  ) {
    const { eeId, inicio } = body;
    if (!eeId || !inicio) throw new BadRequestException('eeId e inicio requeridos');

    const reunion = await this.prisma.reunion.findFirst({
      where: {
        id: Number(id), estaActivo: 1, estadoReunion: { in: ['PROGRAMADA', 'REPROGRAMADA'] },
        solicitudreunion: { OR: [{ empresaEvento_id: Number(eeId) }, { empresaEventorReceptora_id: Number(eeId) }] },
      },
      include: { solicitudreunion: true, mesabloque: { where: { estaActivo: 1 } } },
    });
    if (!reunion) throw new BadRequestException('Reunión no encontrada o no tienes permiso para cambiarla');

    const eventoId = await this.getPrincipalEventoId();
    const evento = await this.prisma.evento.findUnique({ where: { id: eventoId! } });
    if (!evento) throw new BadRequestException('No hay evento activo');

    const iniDate = new Date(inicio);
    const finDate = new Date(iniDate.getTime() + evento.duracionReunion * 60000);
    const sol = (reunion as any).solicitudreunion;
    const eeA = sol.empresaEvento_id;
    const eeB = sol.empresaEventorReceptora_id;

    const [bloqueosA, bloqueosB, reunionesA, reunionesB] = await Promise.all([
      this.prisma.empresa_bloqueo.findMany({ where: { empresaevento_id: eeA } }),
      this.prisma.empresa_bloqueo.findMany({ where: { empresaevento_id: eeB } }),
      this.prisma.reunion.findMany({
        where: { estaActivo: 1, estadoReunion: { not: 'CANCELADA' }, id: { not: Number(id) }, solicitudreunion: { OR: [{ empresaEvento_id: eeA }, { empresaEventorReceptora_id: eeA }] } },
        select: { fechaHoraInicioReunion: true, fechaHoraFinReunion: true },
      }),
      this.prisma.reunion.findMany({
        where: { estaActivo: 1, estadoReunion: { not: 'CANCELADA' }, id: { not: Number(id) }, solicitudreunion: { OR: [{ empresaEvento_id: eeB }, { empresaEventorReceptora_id: eeB }] } },
        select: { fechaHoraInicioReunion: true, fechaHoraFinReunion: true },
      }),
    ]);

    const solapaCon = (r: any, ini: Date, fin: Date) => r.fechaHoraInicioReunion < fin && r.fechaHoraFinReunion > ini;

    if (
      reunionesA.some((r) => solapaCon(r, iniDate, finDate)) ||
      reunionesB.some((r) => solapaCon(r, iniDate, finDate)) ||
      bloqueosA.some((b) => new Date(b.inicio) < finDate && new Date(b.fin) > iniDate) ||
      bloqueosB.some((b) => new Date(b.inicio) < finDate && new Date(b.fin) > iniDate)
    ) {
      throw new BadRequestException('Ese horario ya no está disponible para una de las empresas');
    }

    // For PRESENCIAL: keep same mesa or find another if occupied
    let mesaId = reunion.mesa_id;
    if (reunion.tipoReunion === 'PRESENCIAL') {
      const ocupada = await this.prisma.mesabloque.findFirst({
        where: {
          mesa_id: mesaId!, fechaHoraInicio: iniDate, estaOcupado: 1, estaActivo: 1,
          id: { notIn: (reunion as any).mesabloque.map((m: any) => m.id) },
        },
      });
      if (ocupada) {
        const todasMesas = await this.prisma.mesa.findMany({ where: { evento_id: eventoId!, estaActivo: 1, estaHabilitada: 1 } });
        const ocupadas = await this.prisma.mesabloque.findMany({ where: { fechaHoraInicio: iniDate, estaOcupado: 1, estaActivo: 1 } });
        const ocupadasIds = new Set(ocupadas.map((m) => m.mesa_id));
        const libreM = todasMesas.find((m) => !ocupadasIds.has(m.id));
        if (!libreM) throw new BadRequestException('No hay mesas disponibles en ese horario');
        mesaId = libreM.id;
      }
    }

    // Una reunión aceptada solo cambia después del acuerdo de la contraparte.
    const pendiente = await this.prisma.cambioreunion.findFirst({
      where: { reunion_id: Number(id), estado: 'PENDIENTE', estaActivo: 1 },
    });
    if (pendiente) throw new BadRequestException('Ya existe una propuesta de cambio pendiente para esta reunión');
    const propuesta = await this.prisma.cambioreunion.create({
      data: {
        reunion_id: Number(id), solicitadoPorEe_id: Number(eeId),
        tipoReunion: reunion.tipoReunion, fechaHoraInicio: iniDate, fechaHoraFin: finDate,
        mesa_id: mesaId, enlaceReunionVirtual: sol.enlaceReunionVirtual,
        mensaje: sol.mensajeParaEmpresaReceptora, estado: 'PENDIENTE',
      },
    });
    const contraparte = Number(eeId) === eeA ? eeB : eeA;
    const nuevaHoraPropuesta = this.fmtSlotAsistente(iniDate.toISOString());
    await this.notificar(contraparte, 'reunion:cambio-solicitado', 'Solicitud de cambio en la reunión',
      `La otra empresa solicitó cambiar la reunión al ${nuevaHoraPropuesta}. Debes aceptar el cambio para que se aplique.`,
      propuesta.id, 'cambioreunion');
    return { ok: true, pendienteAprobacion: true, propuesta };
  }

  @Put('empresa/reuniones/cambios/:cambioId/responder')
  async responderCambioReunion(
    @Param('cambioId') cambioId: string,
    @Body() body: { eeId: number; aceptar: boolean; motivo?: string },
  ) {
    const cambio = await this.prisma.cambioreunion.findFirst({
      where: { id: Number(cambioId), estado: 'PENDIENTE', estaActivo: 1 },
      include: { reunion: { include: { solicitudreunion: true } } },
    });
    if (!cambio) throw new BadRequestException('La propuesta ya no está pendiente');
    const sol = cambio.reunion.solicitudreunion;
    const participantes = [sol.empresaEvento_id, sol.empresaEventorReceptora_id];
    if (!participantes.includes(Number(body.eeId)) || cambio.solicitadoPorEe_id === Number(body.eeId))
      throw new BadRequestException('Solo la contraparte puede responder esta propuesta');

    if (!body.aceptar) {
      await this.prisma.cambioreunion.update({
        where: { id: cambio.id },
        data: { estado: 'RECHAZADA', motivoRechazo: body.motivo || null, creadoModificadoFecha: new Date() },
      });
      await this.notificar(cambio.solicitadoPorEe_id, 'reunion:cambio-rechazado', 'Cambio rechazado',
        `La otra empresa rechazó el cambio propuesto.${body.motivo ? ` Motivo: ${body.motivo}` : ''}`,
        cambio.reunion_id, 'reunion');
      return { ok: true, estado: 'RECHAZADA' };
    }

    const mesaId = cambio.mesa_id ?? cambio.reunion.mesa_id;
    const conflicto = await this.prisma.reunion.findFirst({
      where: {
        id: { not: cambio.reunion_id }, mesa_id: mesaId, estaActivo: 1,
        estadoReunion: { not: 'CANCELADA' },
        fechaHoraInicioReunion: { lt: cambio.fechaHoraFin },
        fechaHoraFinReunion: { gt: cambio.fechaHoraInicio },
      },
    });
    if (conflicto) throw new BadRequestException('La mesa u horario propuesto ya no está disponible');

    await this.prisma.$transaction(async (tx) => {
      await tx.mesabloque.updateMany({
        where: { reunion_id: cambio.reunion_id, estaActivo: 1 },
        data: { estaOcupado: 0, estaActivo: 0, creadoModificadoFecha: new Date() },
      });
      if (cambio.tipoReunion === 'PRESENCIAL') {
        await tx.mesabloque.create({
          data: {
            mesa_id: mesaId, reunion_id: cambio.reunion_id,
            fechaHoraInicio: cambio.fechaHoraInicio, fechaHoraFin: cambio.fechaHoraFin,
            estaOcupado: 1, estaActivo: 1,
          },
        });
      }
      await tx.reunion.update({
        where: { id: cambio.reunion_id },
        data: {
          tipoReunion: cambio.tipoReunion, mesa_id: mesaId,
          fechaHoraInicioReunion: cambio.fechaHoraInicio, fechaHoraFinReunion: cambio.fechaHoraFin,
          estadoReunion: 'REPROGRAMADA', seEnvioNotificacionDeRetraso: 0,
          creadoModificadoFecha: new Date(),
        },
      });
      await tx.solicitudreunion.update({
        where: { id: sol.id },
        data: {
          tipoReunion: cambio.tipoReunion, mesa_id: mesaId,
          fechaHoraInicioPropuesta: cambio.fechaHoraInicio, fechaHoraFinPropuesta: cambio.fechaHoraFin,
          enlaceReunionVirtual: cambio.enlaceReunionVirtual,
          mensajeParaEmpresaReceptora: cambio.mensaje, creadoModificadoFecha: new Date(),
        },
      });
      await tx.cambioreunion.update({
        where: { id: cambio.id },
        data: { estado: 'ACEPTADA', creadoModificadoFecha: new Date() },
      });
    });
    for (const ee of participantes) {
      await this.notificar(ee, 'reunion:cambio-aceptado', 'Cambio de reunión acordado',
        'Ambas empresas aceptaron el cambio. La agenda y la mesa ya fueron actualizadas.',
        cambio.reunion_id, 'reunion');
    }
    return { ok: true, estado: 'ACEPTADA' };
  }

  @Put('empresa/reuniones/:id/finalizar')
  async finalizarReunion(
    @Param('id') id: string,
    @Body() body: { eeId: number },
  ) {
    const { eeId } = body;
    if (!eeId) throw new BadRequestException('eeId requerido');
    const reunion = await this.prisma.reunion.findFirst({
      where: {
        id: Number(id), estaActivo: 1,
        estadoReunion: { in: ['PROGRAMADA', 'REPROGRAMADA', 'EN_CURSO'] },
        solicitudreunion: { OR: [{ empresaEvento_id: Number(eeId) }, { empresaEventorReceptora_id: Number(eeId) }] },
      },
    });
    if (!reunion) throw new BadRequestException('Reunión no encontrada o no se puede finalizar');
    const actualizada = await this.prisma.reunion.update({
      where: { id: Number(id) },
      data: { estadoReunion: 'FINALIZADA', creadoModificadoFecha: new Date() },
    });
    await this.notificarParaCalificar(Number(id));
    return actualizada;
  }

  // Al terminar una reunión, avisa a ambos encargados para que registren el
  // resultado (calificación, rango de acuerdo, observaciones). Aparece como
  // notificación/campanita apenas entren a la app si no estaban dentro.
  private async notificarParaCalificar(reunionId: number) {
    try {
      const r = await this.prisma.reunion.findUnique({
        where: { id: reunionId },
        include: { solicitudreunion: { select: { empresaEvento_id: true, empresaEventorReceptora_id: true } } },
      });
      const sol = (r as any)?.solicitudreunion;
      if (!sol) return;
      for (const ee of [sol.empresaEvento_id, sol.empresaEventorReceptora_id]) {
        // Evitar duplicar si ya se envió antes para esta reunión.
        const ya = await this.prisma.notificacion.findFirst({
          where: { empresaevento_id: ee, tipoNotificacion: 'reunion:calificar', referenciaId: reunionId, estaActivo: 1 },
        });
        if (ya) continue;
        await this.notificar(
          ee, 'reunion:calificar', 'Califica tu reunión',
          'Tu reunión terminó. Registra el resultado: calificación, rango de acuerdo y observaciones en la sección Resultados.',
          reunionId, 'reunion',
        );
      }
    } catch {}
  }

  // Iniciar la reunión: si ya es la hora basta un encargado; antes de la hora
  // se requiere que AMBAS empresas presionen "Iniciar ahora" (consentimiento mutuo).
  @Put('empresa/reuniones/:id/iniciar')
  async iniciarReunion(@Param('id') id: string, @Body() body: { eeId: number }) {
    const { eeId } = body;
    if (!eeId) throw new BadRequestException('eeId requerido');

    const reunion = await this.prisma.reunion.findFirst({
      where: {
        id: Number(id), estaActivo: 1,
        estadoReunion: { in: ['PROGRAMADA', 'REPROGRAMADA'] },
        solicitudreunion: { OR: [{ empresaEvento_id: Number(eeId) }, { empresaEventorReceptora_id: Number(eeId) }] },
      },
      include: {
        solicitudreunion: {
          include: {
            empresaevento_solicitudreunion_empresaEvento_idToempresaevento: { include: { empresa: { select: { nombre: true } } } },
            empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento: { include: { empresa: { select: { nombre: true } } } },
          },
        },
      },
    });
    if (!reunion) throw new BadRequestException('Reunión no encontrada o ya no se puede iniciar');

    const sol = (reunion as any).solicitudreunion;
    const soyA = sol.empresaEvento_id === Number(eeId);
    const contraparteEeId = soyA ? sol.empresaEventorReceptora_id : sol.empresaEvento_id;
    const miNombre = soyA
      ? sol.empresaevento_solicitudreunion_empresaEvento_idToempresaevento?.empresa?.nombre
      : sol.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento?.empresa?.nombre;

    const iniciar = async () => {
      await this.prisma.reunion.update({
        where: { id: Number(id) },
        data: { estadoReunion: 'EN_CURSO', inicioAnticipadoPor: null, creadoModificadoFecha: new Date() },
      });
      await this.notificar(sol.empresaEvento_id, 'reunion:iniciada', 'Reunión iniciada',
        'Tu reunión comenzó. ¡Éxitos en la negociación!', Number(id), 'reunion');
      await this.notificar(sol.empresaEventorReceptora_id, 'reunion:iniciada', 'Reunión iniciada',
        'Tu reunión comenzó. ¡Éxitos en la negociación!', Number(id), 'reunion');
      return { ok: true, iniciada: true };
    };

    // Ya es la hora: inicia directo
    if (new Date() >= new Date(reunion.fechaHoraInicioReunion)) {
      return iniciar();
    }

    // Antes de la hora: consentimiento mutuo
    const yaSolicito = (reunion as any).inicioAnticipadoPor;
    if (!yaSolicito) {
      await this.prisma.reunion.update({
        where: { id: Number(id) },
        data: { inicioAnticipadoPor: Number(eeId), creadoModificadoFecha: new Date() },
      });
      await this.notificar(contraparteEeId, 'reunion:inicio-solicitado', 'Quieren iniciar la reunión',
        `${miNombre ?? 'La otra empresa'} quiere iniciar la reunión antes de la hora. Presiona "Iniciar ahora" en Reuniones para aceptar.`,
        Number(id), 'reunion');
      return { ok: true, iniciada: false, esperandoContraparte: true };
    }
    if (yaSolicito === Number(eeId)) {
      return { ok: true, iniciada: false, esperandoContraparte: true };
    }
    // La contraparte ya lo había pedido: ambos de acuerdo → iniciar
    return iniciar();
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
    await this.notificar(ee.id, 'pago-adicional:aprobado', 'Pago adicional aprobado',
      `Tu pago adicional fue aprobado. Ahora tienes ${nuevoTotal} cupos totales.`);
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
    await this.notificar((comp as any).empresaEvento_id, 'pago-adicional:rechazado', 'Pago adicional rechazado',
      `Tu pago adicional fue rechazado.${body.motivo ? ' Motivo: ' + body.motivo : ''}`);
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
      urlCredencialQR: (eu as any).urlCredencialQR ?? null,
    };
  }

  // Encargado edita la ficha comercial de la empresa: oferta, demanda e
  // intereses de búsqueda (usados por Directorio y Oportunidades).
  @Put('empresa/perfil-comercial')
  async updateEmpresaPerfilComercial(@Body() body: { euId: number; oferta?: string; demanda?: string; interesesBusqueda?: string }) {
    const { euId } = body;
    if (!euId) throw new BadRequestException('euId requerido');
    const eu = await this.prisma.empresa_usuario.findUnique({
      where: { id: Number(euId) },
      select: { empresa_id: true, esResponsable: true },
    });
    if (!eu) throw new BadRequestException('Registro no encontrado');
    if (eu.esResponsable !== 1) throw new BadRequestException('Solo el encargado puede editar la ficha comercial de la empresa');
    return this.prisma.empresa.update({
      where: { id: eu.empresa_id },
      data: {
        oferta: body.oferta?.trim() || null,
        demanda: body.demanda?.trim() || null,
        interesesBusqueda: body.interesesBusqueda?.trim() || null,
        creado_modificado_fecha: new Date(),
      },
      select: { id: true, codigo: true, oferta: true, demanda: true, interesesBusqueda: true },
    });
  }

  @Put('empresa/perfil')
  async updateEmpresaPerfil(@Body() body: any) {
    const { euId, nombres, apellidoPaterno, apellidoMaterno, telefono, urlFotoPerfil } = body;
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
        // urlFotoPerfil puede llegar como '' para quitar la foto; solo se ignora si es undefined
        ...(urlFotoPerfil !== undefined ? { urlFotoPerfil } : {}),
        creadoModificadoFecha: new Date(),
      },
      select: { id: true, nombres: true, apellidoPaterno: true, apellidoMaterno: true, correo: true, telefono: true, urlFotoPerfil: true },
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
