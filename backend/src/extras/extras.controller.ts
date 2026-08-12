import {
  Controller, Get, Post, Put, Delete, Param, Body, Query, BadRequestException,
} from '@nestjs/common';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { randomBytes, createHmac } from 'crypto';
import * as QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service.js';

// Paquetes de inscripción, auspiciadores, repositorio de fotos y cronograma en
// vivo. Van en su propio controlador para no seguir engrosando app.controller.
@Controller()
export class ExtrasController {
  constructor(private readonly prisma: PrismaService) {}

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
    return createHmac('sha256', secret).update(`auspiciador-${personaId}`).digest('hex').slice(0, 12);
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
        correo: String(p?.correo ?? '').trim().toLowerCase() || null,
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
      if (p.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.correo))
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
      include: { personas: true },
    });
    // Cada persona entra al evento, así que se le emite su credencial.
    for (const p of ausp.personas) await this.generarQRAuspiciador(p.id);
    return this.obtenerAuspiciador(String(ausp.id));
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
  async galeriaPublica(@Query('limit') limit?: string) {
    const eventoId = await this.eventoPrincipalId();
    const take = Math.min(Number(limit) || 60, 200);
    return this.prisma.fotoevento.findMany({
      where: { evento_id: eventoId, estaActivo: 1 },
      orderBy: { fechaCreacion: 'desc' },
      take,
    });
  }

  @Post('galeria')
  async subirFoto(@Body() body: any) {
    const eventoId = await this.eventoPrincipalId();
    const urlFoto = this.texto(body.urlFoto, 505, 'Fotografía')!;
    if (!/^https?:\/\//i.test(urlFoto))
      throw new BadRequestException('La fotografía debe subirse desde el dispositivo.');

    const empresaUsuarioId = body.empresa_usuario_id ? Number(body.empresa_usuario_id) : null;
    const usuarioId = body.usuario_id ? Number(body.usuario_id) : null;
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

    return this.prisma.fotoevento.create({
      data: {
        evento_id: eventoId,
        empresa_usuario_id: empresaUsuarioId,
        usuario_id: usuarioId,
        autorNombre: this.texto(body.autorNombre, 155, 'Autor')!,
        urlFoto,
        descripcion: this.texto(body.descripcion, 305, 'Descripción', false),
      },
    });
  }

  // Borra el autor su propia foto, o el staff cualquiera (moderación).
  @Delete('galeria/:id')
  async eliminarFoto(@Param('id') id: string, @Query('empresa_usuario_id') euId?: string, @Query('esStaff') esStaff?: string) {
    const foto = await this.prisma.fotoevento.findUnique({ where: { id: Number(id) } });
    if (!foto || foto.estaActivo === 0) throw new BadRequestException('La foto ya no existe.');

    const staff = esStaff === '1' || esStaff === 'true';
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
  async cronogramaVivo() {
    const eventoId = await this.eventoPrincipalId();
    const actividades = await this.prisma.actividadprograma.findMany({
      where: { evento_id: eventoId, estaActivo: 1 },
      orderBy: [{ fechaActividad: 'asc' }, { horaInicioActividad: 'asc' }],
      select: {
        id: true, nombreActividad: true, descripcionActividad: true, tipoActividad: true,
        nombreSalaEspacio: true, fechaActividad: true,
        horaInicioActividad: true, horaFinActividad: true,
        nombreCompletoPilaExpositor: true, organizacionDelExpositor: true,
        estadoEnVivo: true, notaEnVivo: true, horaInicioReal: true, horaFinReal: true,
      },
    });
    return {
      // El cliente refresca contra este sello para saber si algo cambió.
      actualizadoEn: new Date().toISOString(),
      enVivo: actividades.filter((a) => a.estadoEnVivo === 'EN_VIVO').map((a) => a.id),
      actividades,
    };
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
    return this.cronogramaVivo();
  }
}
