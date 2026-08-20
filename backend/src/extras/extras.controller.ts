import {
  Controller, Get, Post, Put, Delete, Param, Body, Query, BadRequestException, Req,
} from '@nestjs/common';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { randomBytes, createHmac } from 'crypto';
import * as nodemailer from 'nodemailer';
import * as QRCode from 'qrcode';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';

// Paquetes de inscripción, auspiciadores, repositorio de fotos y cronograma en
// vivo. Van en su propio controlador para no seguir engrosando app.controller.
@Controller()
export class ExtrasController {
  constructor(private readonly prisma: PrismaService) {}

  private cabeceraCorreo(): string {
    const web = (process.env.WEB_URL || 'https://app.ruedadenegocios.univalle.edu').replace(/\/$/, '');
    return `<div style="text-align:center;margin-bottom:18px"><img src="${web}/assets/iconos/logo.png" alt="Rueda de Negocios" width="190" style="display:inline-block;max-width:190px;max-height:90px;object-fit:contain" /></div>`;
  }

  // ── Utilidades compartidas ────────────────────────────────────────────────

  private async eventoPrincipalId(): Promise<number> {
    const ev = await this.prisma.evento.findFirst({
      where: { esPrincipal: 1, estaActivo: { not: 0 } },
      select: { id: true },
    });
    if (!ev) throw new BadRequestException('No hay un evento principal activo.');
    return ev.id;
  }

  private uploadsBaseUrl(): string {
    return (process.env.PUBLIC_URL || `http://localhost:${process.env.PORT ?? 3334}`).replace(/\/$/, '');
  }

  private esUrlSubidaValida(value: string): boolean {
    try {
      const url = new URL(value);
      const permitidos = new Set([new URL(this.uploadsBaseUrl()).host,
        ...String(process.env.UPLOAD_HOSTS || '').split(',').map((x) => x.trim()).filter(Boolean)]);
      return ['http:', 'https:'].includes(url.protocol) && permitidos.has(url.host) && url.pathname.startsWith('/uploads/');
    } catch { return false; }
  }

  private texto(v: any, max: number, campo: string, obligatorio = true): string | null {
    const s = String(v ?? '').replace(/\s+/g, ' ').trim();
    if (!s) {
      if (obligatorio) throw new BadRequestException(`El campo "${campo}" es obligatorio.`);
      return null;
    }
    if (s.length > max) throw new BadRequestException(`"${campo}" no puede superar ${max} caracteres.`);
    return s;
  }

  // Igual que en app.controller: el enlace del QR no debe poder enumerarse.
  private tokenAuspiciador(personaId: number): string {
    const secret = process.env.JWT_SECRET || 'rueda-cred-secret';
    return createHmac('sha256', secret).update(`auspiciador-${personaId}`).digest('hex');
  }

  private async generarQRAuspiciador(personaId: number): Promise<string> {
    const webUrl = (process.env.WEB_URL || 'http://localhost:3000').replace(/\/$/, '');
    const contenido = `${webUrl}/credencial/auspiciador/${personaId}?t=${this.tokenAuspiciador(personaId)}`;
    const uploadsDir = join(process.cwd(), 'uploads');
    mkdirSync(uploadsDir, { recursive: true });
    const filename = `credencial-ausp-${personaId}-${randomBytes(4).toString('hex')}.png`;
    const buffer = await QRCode.toBuffer(contenido, {
      width: 500, margin: 2, color: { dark: '#0f172a', light: '#ffffff' },
    });
    writeFileSync(join(uploadsDir, filename), buffer);
    const url = `${this.uploadsBaseUrl()}/uploads/${filename}`;
    await this.prisma.auspiciadorpersona.update({ where: { id: personaId }, data: { urlCredencialQR: url } });
    return url;
  }

  private async crearAccesoEmpresaAuspiciador(ausp: any) {
    const responsable = ausp.personas?.[0];
    if (!responsable?.correo) return { creado: false };
    const correo = String(responsable.correo).trim().toLowerCase();
    const existente = await this.prisma.usuario.findFirst({ where: { correo: { equals: correo, mode: 'insensitive' }, estaActivo: 1 } });
    if (existente) return { creado: false, motivo: 'El correo ya tenía una cuenta.' };
    const ciudad = await this.prisma.ciudad.findFirst({ orderBy: { id: 'asc' } });
    if (!ciudad) throw new BadRequestException('No existe una ciudad configurada para crear el acceso del auspiciador.');
    const partes = String(responsable.nombreCompleto).trim().split(/\s+/);
    const nombres = partes.shift() || 'Responsable';
    const apellidoPaterno = partes.shift() || 'Auspiciador';
    const pwd = randomBytes(6).toString('base64url');
    const hash = await bcrypt.hash(pwd, 10);
    const telefono = `AUSP-${ausp.id}-${responsable.id}`;
    const creado = await this.prisma.$transaction(async (tx) => {
      const empresa = await tx.empresa.create({ data: { ciudad_id: ciudad.id, nombre: ausp.nombreEmpresa.substring(0,55), rubro: 'Auspiciador', descripcion: ausp.descripcion, telefonoWhatsapp: telefono, correoCorporativo: correo, estaActivo: 1 } });
      const ee = await tx.empresaevento.create({ data: { empresa_id: empresa.id, evento_id: ausp.evento_id, paquete_id: ausp.paquete_id, tipoParticipacion: ausp.paquete?.tipoParticipacion || 'PRESENCIAL', estadoHabilitacionAcceso: 'HABILITADO', estadoVerificacionPago: 'APROBADO', numeroParticipantes: ausp.cantidadIngresos, estaActivo: 1 } });
      const usuario = await tx.usuario.create({ data: { evento_id: ausp.evento_id, nombres, apellidoPaterno, apellidoMaterno: partes.join(' ') || null, correo, contrasenia: hash, telefono, urlFotoPerfil: '', rolEvento: 'EMPRESA', estaActivo: 1 } });
      await tx.empresa_usuario.create({ data: { empresa_id: empresa.id, empresaevento_id: ee.id, usuario_id: usuario.id, cargo: responsable.cargo || 'Responsable', esResponsable: 1, estaActivo: 1 } });
      return { empresa, ee, usuario };
    });
    const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS } });
    await transporter.sendMail({ from: process.env.MAIL_FROM || process.env.MAIL_USER, to: correo, subject: `Acceso a la plataforma — ${ausp.nombreEmpresa}`, html: `${this.cabeceraCorreo()}<div style="font-family:Arial;max-width:560px;margin:auto"><h2 style="color:#449D3A">Acceso de empresa auspiciadora</h2><p>Ya puedes ingresar como empresa y acceder a las funcionalidades del evento.</p><div style="padding:18px;background:#f0fdf4;border-radius:12px"><b>Correo:</b> ${correo}<br/><b>Contraseña temporal:</b> ${pwd}</div><p><a href="${(process.env.WEB_URL || 'http://localhost:3000').replace(/\/$/,'')}/auth/login">Ingresar a la plataforma</a></p></div>` });
    return { creado: true, empresaEventoId: creado.ee.id };
  }

  private async enviarCredencialAuspiciador(personaId: number): Promise<void> {
    const persona = await this.prisma.auspiciadorpersona.findUnique({
      where: { id: personaId },
      include: { auspiciador: { include: { evento: true } } },
    });
    if (!persona?.correo || !persona.urlCredencialQR) return;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
    });
    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: persona.correo,
      subject: `Tu credencial para ${persona.auspiciador.evento.nombre}`,
      html: `${this.cabeceraCorreo()}<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#1f2937">
        <h2 style="color:#449D3A">Hola, ${persona.nombreCompleto}</h2>
        <p>Fuiste registrado como representante de <strong>${persona.auspiciador.nombreEmpresa}</strong>
        para <strong>${persona.auspiciador.evento.nombre}</strong>.</p>
        <p>Presenta esta credencial QR para ingresar al evento:</p>
        <p style="text-align:center"><img src="${persona.urlCredencialQR}" alt="Credencial QR" width="280" style="max-width:100%;height:auto" /></p>
        <p style="text-align:center"><a href="${persona.urlCredencialQR}" style="color:#449D3A;font-weight:bold">Abrir o descargar credencial</a></p>
        <p style="font-size:12px;color:#6b7280">Esta credencial es personal y corresponde únicamente a este evento.</p>
      </div>`,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAQUETES DE INSCRIPCIÓN
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('public/paquetes')
  async paquetesPublicos() {
    const eventoId = await this.eventoPrincipalId();
    return this.prisma.paquete.findMany({
      where: { evento_id: eventoId, estaActivo: 1 },
      orderBy: [{ orden: 'asc' }, { costo: 'asc' }],
    });
  }

  @Get('admin/paquetes')
  async listarPaquetes() {
    const eventoId = await this.eventoPrincipalId();
    return this.prisma.paquete.findMany({
      where: { evento_id: eventoId, estaActivo: 1 },
      orderBy: [{ orden: 'asc' }, { costo: 'asc' }],
      include: { _count: { select: { empresaevento: true, auspiciador: true } } },
    });
  }

  private datosPaquete(body: any) {
    const costo = Number(body.costo);
    if (!Number.isFinite(costo) || costo < 0)
      throw new BadRequestException('El costo debe ser un número mayor o igual a 0.');
    const credenciales = Number(body.credencialesIncluidas);
    if (!Number.isInteger(credenciales) || credenciales < 1)
      throw new BadRequestException('Las credenciales incluidas deben ser al menos 1.');

    // El tope de personas no puede quedar por debajo de lo que el paquete ya
    // incluye, o la empresa no podría cargar ni las credenciales que pagó.
    const maxParticipantes = Number(body.maxParticipantes ?? credenciales);
    if (!Number.isInteger(maxParticipantes) || maxParticipantes < credenciales)
      throw new BadRequestException(
        `El máximo de participantes (${maxParticipantes}) no puede ser menor que las ${credenciales} credenciales incluidas.`,
      );

    const nivelMesa = String(body.nivelMesa ?? 'NORMAL').toUpperCase();
    if (!['NORMAL', 'PREFERENCIAL', 'VIP'].includes(nivelMesa))
      throw new BadRequestException('El nivel de mesa debe ser NORMAL, PREFERENCIAL o VIP.');

    const tipoParticipacion = String(body.tipoParticipacion ?? 'PRESENCIAL').toUpperCase();
    if (!['PRESENCIAL', 'VIRTUAL', 'HIBRIDO'].includes(tipoParticipacion))
      throw new BadRequestException('La modalidad debe ser PRESENCIAL, VIRTUAL o HIBRIDO.');

    const bandera = (v: any, pordefecto = 0) => (v === undefined || v === null ? pordefecto : (v ? 1 : 0));

    return {
      maxParticipantes,
      nivelMesa,
      tipoParticipacion,
      apareceEnCatalogo: bandera(body.apareceEnCatalogo, 1),
      logoEnWeb: bandera(body.logoEnWeb, 0),
      destacadoEnListados: bandera(body.destacadoEnListados, 0),
      nombre: this.texto(body.nombre, 105, 'Nombre del paquete')!,
      objetivo: this.texto(body.objetivo, 205, 'Objetivo', false),
      descripcion: this.texto(body.descripcion, 505, 'Descripción', false),
      // El contenido se guarda con saltos de línea reales (una viñeta por línea).
      contenido: String(body.contenido ?? '')
        .split('\n').map((l) => l.trim()).filter(Boolean).join('\n') || null,
      costo,
      credencialesIncluidas: credenciales,
      urlQR: this.texto(body.urlQR, 505, 'QR de pago', false),
      orden: Number(body.orden) || 0,
    };
  }

  @Post('admin/paquetes')
  async crearPaquete(@Body() body: any) {
    const eventoId = await this.eventoPrincipalId();
    return this.prisma.paquete.create({ data: { ...this.datosPaquete(body), evento_id: eventoId } });
  }

  @Put('admin/paquetes/:id')
  async editarPaquete(@Param('id') id: string, @Body() body: any) {
    return this.prisma.paquete.update({
      where: { id: Number(id) },
      data: { ...this.datosPaquete(body), creadoModificadoFecha: new Date() },
    });
  }

  @Delete('admin/paquetes/:id')
  async eliminarPaquete(@Param('id') id: string) {
    const paqueteId = Number(id);
    // Eliminación lógica; además se impide dejar inscripciones huérfanas.
    const enUso = await this.prisma.empresaevento.count({
      where: { paquete_id: paqueteId, estaActivo: 1 },
    });
    if (enUso > 0)
      throw new BadRequestException(
        `No se puede eliminar: ${enUso} empresa(s) ya se inscribieron con este paquete.`,
      );
    await this.prisma.paquete.update({
      where: { id: paqueteId },
      data: { estaActivo: 0, creadoModificadoFecha: new Date() },
    });
    return { ok: true };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AUSPICIADORES
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('admin/auspiciadores')
  async listarAuspiciadores() {
    const eventoId = await this.eventoPrincipalId();
    return this.prisma.auspiciador.findMany({
      where: { evento_id: eventoId, estaActivo: 1 },
      orderBy: { fechaCreacion: 'desc' },
      include: {
        paquete: { select: { id: true, nombre: true, costo: true } },
        personas: { where: { estaActivo: 1 }, orderBy: { id: 'asc' } },
      },
    });
  }

  @Get('admin/auspiciadores/:id')
  async obtenerAuspiciador(@Param('id') id: string) {
    const ausp = await this.prisma.auspiciador.findUnique({
      where: { id: Number(id) },
      include: {
        paquete: { select: { id: true, nombre: true, costo: true } },
        personas: { where: { estaActivo: 1 }, orderBy: { id: 'asc' } },
      },
    });
    if (!ausp || ausp.estaActivo === 0) throw new BadRequestException('Auspiciador no encontrado.');
    return ausp;
  }

  private datosAuspiciador(body: any) {
    const tipoAporte = String(body.tipoAporte ?? '').toUpperCase();
    if (!['DINERO', 'INSUMOS', 'AMBOS'].includes(tipoAporte))
      throw new BadRequestException('El aporte debe ser DINERO, INSUMOS o AMBOS.');

    // El monto solo tiene sentido si aporta dinero.
    let montoAporte: number | null = null;
    if (tipoAporte !== 'INSUMOS') {
      const m = Number(body.montoAporte);
      if (!Number.isFinite(m) || m <= 0)
        throw new BadRequestException('Indica el monto aportado (mayor a 0).');
      montoAporte = m;
    }
    // El detalle solo tiene sentido si aporta insumos.
    let detalleAporte: string | null = null;
    if (tipoAporte !== 'DINERO') {
      detalleAporte = this.texto(body.detalleAporte, 505, 'Detalle de los insumos');
    }

    const cantidadIngresos = Number(body.cantidadIngresos);
    if (!Number.isInteger(cantidadIngresos) || cantidadIngresos < 1)
      throw new BadRequestException('La cantidad de ingresos debe ser al menos 1.');

    return {
      nombreEmpresa: this.texto(body.nombreEmpresa, 155, 'Nombre de la empresa')!,
      descripcion: this.texto(body.descripcion, 1000, 'Descripción de la empresa')!,
      tipoAporte,
      detalleAporte,
      montoAporte,
      paquete_id: body.paquete_id ? Number(body.paquete_id) : null,
      cantidadIngresos,
    };
  }

  // Las personas llegan como lista; deben coincidir con la cantidad de ingresos
  // declarada, que es justamente cuántas credenciales se emiten.
  private personasValidadas(body: any, cantidadIngresos: number) {
    const personas = Array.isArray(body.personas) ? body.personas : [];
    const limpias = personas
      .map((p: any) => ({
        nombreCompleto: String(p?.nombreCompleto ?? '').replace(/\s+/g, ' ').trim(),
        cargo: String(p?.cargo ?? '').replace(/\s+/g, ' ').trim() || null,
        correo: String(p?.correo ?? '').trim().toLowerCase(),
      }))
      .filter((p: any) => p.nombreCompleto);

    if (limpias.length === 0)
      throw new BadRequestException('Registra al menos una persona del auspiciador.');
    if (limpias.length !== cantidadIngresos)
      throw new BadRequestException(
        `Declaraste ${cantidadIngresos} ingreso(s) pero cargaste ${limpias.length} persona(s). Deben coincidir.`,
      );
    for (const p of limpias) {
      if (p.nombreCompleto.length > 155)
        throw new BadRequestException('El nombre de una persona supera los 155 caracteres.');
      if (!p.correo)
        throw new BadRequestException(`El correo de ${p.nombreCompleto} es obligatorio para enviar su credencial.`);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.correo))
        throw new BadRequestException(`El correo "${p.correo}" no es válido.`);
    }
    return limpias;
  }

  @Post('admin/auspiciadores')
  async crearAuspiciador(@Body() body: any) {
    const eventoId = await this.eventoPrincipalId();
    const datos = this.datosAuspiciador(body);
    const personas = this.personasValidadas(body, datos.cantidadIngresos);

    const ausp = await this.prisma.auspiciador.create({
      data: { ...datos, evento_id: eventoId, personas: { create: personas } },
      include: { personas: true, paquete: true },
    });
    // Cada persona entra al evento, así que se le emite su credencial.
    const correosFallidos: string[] = [];
    for (const p of ausp.personas) {
      await this.generarQRAuspiciador(p.id);
      try {
        await this.enviarCredencialAuspiciador(p.id);
      } catch {
        correosFallidos.push(p.correo || 'sin correo');
      }
    }
    let accesoPlataforma: any;
    try {
      accesoPlataforma = await this.crearAccesoEmpresaAuspiciador(ausp);
    } catch (error) {
      accesoPlataforma = { creado: false, motivo: error instanceof Error ? error.message : 'No se pudo enviar el acceso' };
    }
    return { ...(await this.obtenerAuspiciador(String(ausp.id))), accesoPlataforma, correosFallidos };
  }

  @Put('admin/auspiciadores/:id')
  async editarAuspiciador(@Param('id') id: string, @Body() body: any) {
    const auspId = Number(id);
    const datos = this.datosAuspiciador(body);
    const personas = this.personasValidadas(body, datos.cantidadIngresos);

    await this.prisma.auspiciador.update({
      where: { id: auspId },
      data: { ...datos, creadoModificadoFecha: new Date() },
    });

    // Las personas que ya existen conservan su credencial; solo se emite QR a
    // las nuevas, para no invalidar QRs ya entregados o impresos.
    const actuales = await this.prisma.auspiciadorpersona.findMany({
      where: { auspiciador_id: auspId, estaActivo: 1 },
    });
    const enviadas = personas as Array<{ nombreCompleto: string; cargo: string | null; correo: string | null }>;

    const sobrantes = actuales.slice(enviadas.length);
    for (const s of sobrantes)
      await this.prisma.auspiciadorpersona.update({ where: { id: s.id }, data: { estaActivo: 0 } });

    for (let i = 0; i < enviadas.length; i++) {
      const existente = actuales[i];
      if (existente) {
        await this.prisma.auspiciadorpersona.update({ where: { id: existente.id }, data: enviadas[i] });
      } else {
        const creada = await this.prisma.auspiciadorpersona.create({
          data: { ...enviadas[i], auspiciador_id: auspId },
        });
        await this.generarQRAuspiciador(creada.id);
        await this.enviarCredencialAuspiciador(creada.id);
      }
    }
    return this.obtenerAuspiciador(String(auspId));
  }

  @Delete('admin/auspiciadores/:id')
  async eliminarAuspiciador(@Param('id') id: string) {
    const auspId = Number(id);
    await this.prisma.auspiciadorpersona.updateMany({
      where: { auspiciador_id: auspId },
      data: { estaActivo: 0 },
    });
    await this.prisma.auspiciador.update({
      where: { id: auspId },
      data: { estaActivo: 0, creadoModificadoFecha: new Date() },
    });
    return { ok: true };
  }

  // Credencial pública de una persona del auspiciador (la abre quien escanea).
  @Get('public/credencial-auspiciador/:id')
  async credencialAuspiciador(@Param('id') id: string, @Query('t') token: string) {
    const personaId = Number(id);
    if (!personaId) throw new BadRequestException('Credencial inválida');
    if (!token || token !== this.tokenAuspiciador(personaId))
      throw new BadRequestException('Credencial inválida o alterada');

    const persona = await this.prisma.auspiciadorpersona.findUnique({
      where: { id: personaId },
      include: { auspiciador: { include: { evento: { select: { nombre: true, edicion: true } } } } },
    });
    if (!persona || persona.estaActivo === 0 || persona.auspiciador.estaActivo === 0)
      throw new BadRequestException('Credencial no vigente');

    return {
      tipo: 'AUSPICIADOR',
      nombreCompleto: persona.nombreCompleto,
      cargo: persona.cargo,
      empresa: persona.auspiciador.nombreEmpresa,
      evento: persona.auspiciador.evento.nombre,
      edicion: persona.auspiciador.evento.edicion,
      habilitado: true,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REPOSITORIO DE FOTOGRAFÍAS
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('public/galeria')
  async galeriaPublica(@Query('limit') limit?: string, @Query('soloTecnicos') soloTecnicos?: string) {
    const eventoId = await this.eventoPrincipalId();
    const take = Math.min(Number(limit) || 60, 200);
    let usuariosTecnicos: number[] | undefined;
    if (soloTecnicos === '1' || soloTecnicos === 'true') {
      const tecnicos = await this.prisma.usuario.findMany({
        where: { evento_id: eventoId, rolEvento: { in: ['TECNICO', 'TECNICO_EVENTOS'] }, estaActivo: 1 },
        select: { id: true },
      });
      usuariosTecnicos = tecnicos.map((u) => u.id);
    }
    return this.prisma.fotoevento.findMany({
      where: { evento_id: eventoId, estaActivo: 1, ...(usuariosTecnicos ? { usuario_id: { in: usuariosTecnicos } } : {}) },
      orderBy: { fechaCreacion: 'desc' },
      take,
      select: { id: true, urlFoto: true, descripcion: true, fechaCreacion: true },
    });
  }

  @Get('galeria')
  async galeriaPrivada(@Query('limit') limit?: string, @Query('soloTecnicos') soloTecnicos?: string) {
    const eventoId = await this.eventoPrincipalId();
    const take = Math.min(Number(limit) || 60, 200);
    let usuariosTecnicos: number[] | undefined;
    if (soloTecnicos === '1' || soloTecnicos === 'true') {
      const tecnicos = await this.prisma.usuario.findMany({ where: { evento_id: eventoId, rolEvento: { in: ['TECNICO', 'TECNICO_EVENTOS'] }, estaActivo: 1 }, select: { id: true } });
      usuariosTecnicos = tecnicos.map((u) => u.id);
    }
    return this.prisma.fotoevento.findMany({ where: { evento_id: eventoId, estaActivo: 1, ...(usuariosTecnicos ? { usuario_id: { in: usuariosTecnicos } } : {}) }, orderBy: { fechaCreacion: 'desc' }, take });
  }

  @Post('galeria')
  async subirFoto(@Body() body: any, @Req() req: any) {
    const eventoId = await this.eventoPrincipalId();
    const urlFoto = this.texto(body.urlFoto, 505, 'Fotografía')!;
    if (!this.esUrlSubidaValida(urlFoto))
      throw new BadRequestException('La fotografía debe subirse desde el dispositivo.');

    const empresaUsuarioId = body.empresa_usuario_id ? Number(body.empresa_usuario_id) : null;
    const usuarioId = body.usuario_id ? Number(body.usuario_id) : null;
    let autorNombre = '';
    if (!empresaUsuarioId && !usuarioId)
      throw new BadRequestException('No se pudo identificar quién sube la foto.');

    // Solo participantes habilitados pueden alimentar el repositorio.
    if (empresaUsuarioId) {
      const eu = await this.prisma.empresa_usuario.findUnique({
        where: { id: empresaUsuarioId },
        include: { empresaevento: { select: { estadoHabilitacionAcceso: true, evento_id: true } } },
      });
      if (!eu || eu.estaActivo === 0 || eu.empresaevento.evento_id !== eventoId)
        throw new BadRequestException('Participante no válido para este evento.');
      if (eu.empresaevento.estadoHabilitacionAcceso !== 'HABILITADO')
        throw new BadRequestException('Tu empresa aún no está habilitada para subir fotos.');
    }

    if (empresaUsuarioId) {
      const euAutor = await this.prisma.empresa_usuario.findUnique({ where: { id: empresaUsuarioId }, select: { usuario_id: true } });
      const autor = euAutor ? await this.prisma.usuario.findUnique({ where: { id: euAutor.usuario_id }, select: { nombres: true, apellidoPaterno: true } }) : null;
      autorNombre = `${autor?.nombres || ''} ${autor?.apellidoPaterno || ''}`.trim();
    } else {
      if (Number(usuarioId) !== Number(req.user?.sub)) throw new BadRequestException('Usuario no autorizado.');
      const autor = await this.prisma.usuario.findUnique({ where: { id: Number(usuarioId) }, select: { nombres: true, apellidoPaterno: true } });
      autorNombre = `${autor?.nombres || ''} ${autor?.apellidoPaterno || ''}`.trim();
    }
    return this.prisma.fotoevento.create({
      data: {
        evento_id: eventoId,
        empresa_usuario_id: empresaUsuarioId,
        usuario_id: usuarioId,
        autorNombre: this.texto(autorNombre, 155, 'Autor')!,
        urlFoto,
        descripcion: this.texto(body.descripcion, 305, 'Descripción', false),
      },
    });
  }

  // Borra el autor su propia foto, o el staff cualquiera (moderación).
  @Delete('galeria/:id')
  async eliminarFoto(@Param('id') id: string, @Req() req: any, @Query('empresa_usuario_id') euId?: string) {
    const foto = await this.prisma.fotoevento.findUnique({ where: { id: Number(id) } });
    if (!foto || foto.estaActivo === 0) throw new BadRequestException('La foto ya no existe.');

    const staff = ['ADMINISTRADOR', 'TECNICO', 'TECNICO_EVENTOS'].includes(req.user?.role);
    if (!staff && (!euId || foto.empresa_usuario_id !== Number(euId)))
      throw new BadRequestException('Solo puedes eliminar las fotos que tú subiste.');

    await this.prisma.fotoevento.update({ where: { id: foto.id }, data: { estaActivo: 0 } });
    return { ok: true };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CRONOGRAMA EN VIVO
  // ═══════════════════════════════════════════════════════════════════════════

  // Devuelve la agenda del día con lo que está pasando ahora mismo.
  @Get('public/cronograma-vivo')
  async cronogramaVivo(@Query('eeId') eeId?: string) {
    const eventoId = await this.eventoPrincipalId();
    const actividades = await this.prisma.actividadprograma.findMany({
      where: { evento_id: eventoId, estaActivo: 1 },
      orderBy: [{ fechaActividad: 'asc' }, { horaInicioActividad: 'asc' }],
      select: {
        id: true, nombreActividad: true, descripcionActividad: true, tipoActividad: true,
        nombreSalaEspacio: true, fechaActividad: true,
        horaInicioActividad: true, horaFinActividad: true,
        nombreCompletoPilaExpositor: true, organizacionDelExpositor: true,
        urlImagenBannerActividad: true, linkReunionVirtual: true,
        direccion_texto: true, ubicacionGoogleMapsPresencial: true,
        estadoEnVivo: true, notaEnVivo: true, horaInicioReal: true, horaFinReal: true,
        anuncios: { where: { estaActivo: 1 }, orderBy: { fechaCreacion: 'desc' }, take: 10,
          select: { id: true, mensaje: true, fechaCreacion: true, usuario: { select: { nombres: true, apellidoPaterno: true } } } },
      },
    });
    return {
      // El cliente refresca contra este sello para saber si algo cambió.
      actualizadoEn: new Date().toISOString(),
      enVivo: actividades.filter((a) => a.estadoEnVivo === 'EN_VIVO').map((a) => a.id),
      actividades: await Promise.all(actividades.map(async (a) => ({ ...a,
        suscrito: eeId ? !!(await this.prisma.suscripcionactividad.findFirst({ where: { actividad_id: a.id, empresaevento_id: Number(eeId), estaActivo: 1 }, select: { id: true } })) : false,
      }))),
    };
  }

  @Put('empresa/cronograma-vivo/:id/suscripcion')
  async suscribirActividad(@Param('id') id: string, @Body() body: any) {
    const actividadId = Number(id), eeId = Number(body.eeId);
    const actividad = await this.prisma.actividadprograma.findFirst({ where: { id: actividadId, estaActivo: 1 } });
    const ee = await this.prisma.empresaevento.findFirst({ where: { id: eeId, estaActivo: 1 } });
    if (!actividad || !ee || actividad.evento_id !== ee.evento_id) throw new BadRequestException('Actividad o empresa no válidas para este evento.');
    const estaActivo = body.suscrito === false ? 0 : 1;
    return this.prisma.suscripcionactividad.upsert({
      where: { actividad_id_empresaevento_id: { actividad_id: actividadId, empresaevento_id: eeId } },
      create: { actividad_id: actividadId, empresaevento_id: eeId, estaActivo },
      update: { estaActivo },
    });
  }

  @Post('staff/cronograma-vivo/:id/anuncios')
  async crearAnuncioActividad(@Param('id') id: string, @Body() body: any) {
    const actividadId = Number(id), usuarioId = Number(body.usuarioId);
    const mensaje = this.texto(body.mensaje, 500, 'Anuncio')!;
    const actividad = await this.prisma.actividadprograma.findFirst({ where: { id: actividadId, estaActivo: 1 } });
    const usuario = await this.prisma.usuario.findFirst({ where: { id: usuarioId, estaActivo: 1, rolEvento: { in: ['ADMINISTRADOR', 'TECNICO', 'TECNICO_EVENTOS'] } } });
    if (!actividad || !usuario || usuario.evento_id !== actividad.evento_id) throw new BadRequestException('No tienes acceso a esta actividad.');
    const anuncio = await this.prisma.anuncioactividad.create({ data: { actividad_id: actividadId, usuario_id: usuarioId, mensaje } });
    const subs = await this.prisma.suscripcionactividad.findMany({ where: { actividad_id: actividadId, estaActivo: 1 }, select: { empresaevento_id: true } });
    if (subs.length) await this.prisma.notificacion.createMany({ data: subs.map((s) => ({
      empresaevento_id: s.empresaevento_id, tituloNotificacion: `Aviso: ${actividad.nombreActividad}`,
      mensajeNotificacion: mensaje, tipoNotificacion: 'evento:anuncio', referenciaId: actividadId,
      referenciaNombreTabla: 'actividadprograma', haSidoLeida: 0, estaActivo: 1,
    })) });
    return anuncio;
  }

  @Delete('staff/cronograma-vivo/anuncios/:id')
  async eliminarAnuncioActividad(@Param('id') id: string, @Query('usuarioId') usuarioId: string) {
    const usuario = await this.prisma.usuario.findFirst({ where: { id: Number(usuarioId), estaActivo: 1, rolEvento: { in: ['ADMINISTRADOR', 'TECNICO', 'TECNICO_EVENTOS'] } } });
    const anuncio = await this.prisma.anuncioactividad.findUnique({ where: { id: Number(id) }, include: { actividad: true } });
    if (!usuario || !anuncio || usuario.evento_id !== anuncio.actividad.evento_id) throw new BadRequestException('Anuncio no encontrado.');
    return this.prisma.anuncioactividad.update({ where: { id: anuncio.id }, data: { estaActivo: 0 } });
  }

  // Admin y técnicos mueven el cronograma durante el evento.
  @Put('staff/cronograma-vivo/:id')
  async cambiarEstadoEnVivo(@Param('id') id: string, @Body() body: any) {
    const estado = String(body.estadoEnVivo ?? '').toUpperCase();
    if (!['PENDIENTE', 'EN_VIVO', 'FINALIZADA'].includes(estado))
      throw new BadRequestException('Estado inválido. Usa PENDIENTE, EN_VIVO o FINALIZADA.');

    const actividadId = Number(id);
    const actividad = await this.prisma.actividadprograma.findUnique({ where: { id: actividadId } });
    if (!actividad || actividad.estaActivo === 0)
      throw new BadRequestException('Actividad no encontrada.');

    const ahora = new Date();
    const data: any = {
      estadoEnVivo: estado,
      notaEnVivo: this.texto(body.notaEnVivo, 305, 'Nota', false),
      creadoModificadoFecha: ahora,
    };
    // Se sella la hora real solo la primera vez que entra/sale de vivo.
    if (estado === 'EN_VIVO' && !actividad.horaInicioReal) data.horaInicioReal = ahora;
    if (estado === 'FINALIZADA' && !actividad.horaFinReal) data.horaFinReal = ahora;

    await this.prisma.actividadprograma.update({ where: { id: actividadId }, data });
    if (estado === 'EN_VIVO' && actividad.estadoEnVivo !== 'EN_VIVO') {
      const subs = await this.prisma.suscripcionactividad.findMany({ where: { actividad_id: actividadId, estaActivo: 1 }, select: { empresaevento_id: true } });
      if (subs.length) await this.prisma.notificacion.createMany({ data: subs.map((s) => ({
        empresaevento_id: s.empresaevento_id,
        tituloNotificacion: `Ya inició: ${actividad.nombreActividad}`,
        mensajeNotificacion: 'La actividad a la que te suscribiste acaba de comenzar.',
        tipoNotificacion: 'evento:inicio', referenciaId: actividadId,
        referenciaNombreTabla: 'actividadprograma', haSidoLeida: 0, estaActivo: 1,
      })) });
    }
    return this.cronogramaVivo();
  }
}
