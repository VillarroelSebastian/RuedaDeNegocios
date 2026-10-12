import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';

export type AuthUser = { sub: number; role: string; eventoId?: number | null; eeIds?: number[]; euIds?: number[] };

const PUBLIC_ROUTES = new Set([
  'GET /', 'POST /auth/login', 'POST /auth/solicitar-reset', 'POST /auth/confirmar-reset',
  'GET /public/evento', 'GET /public/verificar-empresa', 'GET /public/credencial',
  'GET /public/credencial-auspiciador', 'GET /public/ciudades', 'POST /public/registro',
  'GET /public/actividades', 'GET /public/paquetes', 'GET /public/galeria',
  'POST /public/registro-foro', 'GET /public/cronograma-vivo', 'GET /evento-principal',
  'GET /public/seguimiento', 'POST /public/seguimiento/comprobante', 'POST /public/imagenes/upload',
]);

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<any>();
    const path = String(req.path || '/');
    const publicKey = `${req.method} ${path.replace(/\/\d+(?=\/|$)/g, '')}`;
    if (PUBLIC_ROUTES.has(publicKey)) return true;

    const raw = String(req.headers?.authorization || '');
    if (!raw.startsWith('Bearer ')) throw new UnauthorizedException('Se requiere una sesión válida.');
    let payload: AuthUser;
    try { payload = await this.jwt.verifyAsync<AuthUser>(raw.slice(7)); }
    catch { throw new UnauthorizedException('La sesión es inválida o expiró.'); }

    const dbUser = await this.prisma.usuario.findFirst({
      where: { id: Number(payload.sub), estaActivo: 1 },
      select: { id: true, rolEvento: true, evento_id: true,
        empresa_usuario: {
          where: {
            estaActivo: 1,
            empresaevento: {
              estaActivo: 1,
              estadoHabilitacionAcceso: 'HABILITADO',
              estadoVerificacionPago: 'COMPLETADO',
            },
          },
          select: { id: true, empresaevento_id: true, esResponsable: true },
        },
      },
    });
    if (!dbUser || dbUser.rolEvento !== payload.role) throw new UnauthorizedException('La cuenta ya no está habilitada.');
    const eeIds = dbUser.empresa_usuario.map((x) => x.empresaevento_id);
    const euIds = dbUser.empresa_usuario.map((x) => x.id);
    const esEncargado = dbUser.empresa_usuario.some((x) => x.esResponsable === 1);
    let eventoId = dbUser.evento_id;
    if (['TECNICO', 'TECNICO_EVENTOS'].includes(dbUser.rolEvento)) {
      const principal = await this.prisma.evento.findFirst({
        where: { esPrincipal: 1, estaActivo: { not: 0 } },
        select: { id: true },
      });
      eventoId = principal?.id ?? null;
    }
    req.user = { sub: dbUser.id, role: dbUser.rolEvento, eventoId, eeIds, euIds } satisfies AuthUser;

    if (path.startsWith('/admin/') && dbUser.rolEvento !== 'ADMINISTRADOR') {
      const tecnicoPuedeGestionarContenido = ['/admin/noticias', '/admin/actividades', '/admin/eventos', '/admin/imagenes', '/admin/perfil']
        .some((prefix) => path.startsWith(prefix));
      if (!tecnicoPuedeGestionarContenido || !['TECNICO', 'TECNICO_EVENTOS'].includes(dbUser.rolEvento))
        throw new ForbiddenException('Se requiere el rol administrador.');
    }
    if ((path.startsWith('/tecnico/') || path.startsWith('/staff/')) &&
        !['ADMINISTRADOR', 'TECNICO', 'TECNICO_EVENTOS'].includes(dbUser.rolEvento))
      throw new ForbiddenException('Se requiere un rol del equipo del evento.');
    // Un usuario FORO es una inscripción individual: reutiliza las pantallas de
    // empresa (comunicados, cronograma, perfil, galería, etc.) pero no tiene
    // acceso a nada de matchmaking de negocios (reuniones, empresas, mensajes...).
    const EMPRESA_BLOQUEADO_PARA_FORO = [
      '/empresa/reuniones', '/empresa/empresas', '/empresa/directorio', '/empresa/mensajes',
      '/empresa/oportunidades', '/empresa/solicitudes', '/empresa/horarios', '/empresa/resultados',
      '/empresa/participantes',
    ];
    // Un participante (no encargado) de una empresa solo asiste a las
    // reuniones que ya se agendaron: no gestiona el paquete, resultados,
    // solicitudes/agenda de reuniones, el directorio de empresas, las
    // oportunidades ni la mensajería — eso es responsabilidad exclusiva del
    // encargado. Las rutas de abajo son las de gestión; la lista en sí
    // (GET /empresa/reuniones) queda fuera a propósito para que sí puedan
    // ver sus próximas reuniones.
    const EMPRESA_BLOQUEADO_PARA_PARTICIPANTE = [
      '/empresa/mi-paquete', '/empresa/resultados', '/empresa/solicitudes',
      '/empresa/directorio', '/empresa/empresas', '/empresa/oportunidades',
      '/empresa/mensajes', '/empresa/horarios',
      '/empresa/mesas-disponibles', '/empresa/reuniones/',
    ];
    if (path.startsWith('/empresa/')) {
      if (!['EMPRESA', 'FORO'].includes(dbUser.rolEvento))
        throw new ForbiddenException('Se requiere una cuenta de empresa.');
      if (dbUser.rolEvento === 'FORO' && EMPRESA_BLOQUEADO_PARA_FORO.some((p) => path.startsWith(p)))
        throw new ForbiddenException('La inscripción al foro no incluye funciones de negocios.');
      if (dbUser.rolEvento === 'EMPRESA' && !esEncargado && EMPRESA_BLOQUEADO_PARA_PARTICIPANTE.some((p) => path.startsWith(p)))
        throw new ForbiddenException('Esta función solo está disponible para el encargado de la empresa.');
      if (path.startsWith('/empresa/mi-paquete')) {
        if (dbUser.rolEvento === 'FORO') throw new ForbiddenException('Los paquetes no están disponibles para esta inscripción.');
        const member = await this.prisma.empresa_usuario.findFirst({
          where: { usuario_id: dbUser.id, empresaevento_id: Number(req.query?.eeId ?? req.body?.eeId), estaActivo: 1 },
          include: { empresa: { select: { rubro: true } } },
        });
        if (!member || member.empresa.rubro.toLowerCase() === 'auspiciador')
          throw new ForbiddenException('Los paquetes no están disponibles para esta inscripción.');
      }
    }

    if (['EMPRESA', 'FORO'].includes(dbUser.rolEvento)) {
      const input = { ...(req.query || {}), ...(req.body || {}) };
      for (const key of ['eeId', 'empresaEventoId', 'miEeId']) {
        if (input[key] != null && !eeIds.includes(Number(input[key])))
          throw new ForbiddenException('No puedes actuar en nombre de otra empresa.');
      }
      if (input.usuarioId != null && Number(input.usuarioId) !== dbUser.id)
        throw new ForbiddenException('No puedes actuar en nombre de otro usuario.');
      for (const key of ['euId', 'euEncargadoId', 'empresa_usuario_id']) {
        if (input[key] != null && !euIds.includes(Number(input[key])))
          throw new ForbiddenException('El participante no pertenece a tu empresa.');
      }
    }
    if (['TECNICO', 'TECNICO_EVENTOS'].includes(dbUser.rolEvento)) {
      const input = { ...(req.query || {}), ...(req.body || {}) };
      for (const key of ['usuarioId', 'usuario_id', 'tecnicoId']) {
        if (input[key] != null && Number(input[key]) !== dbUser.id)
          throw new ForbiddenException('No puedes actuar en nombre de otro miembro del equipo.');
      }
      if (path.startsWith('/admin/perfil/') && Number(req.params?.id) !== dbUser.id)
        throw new ForbiddenException('Solo puedes modificar tu propio perfil.');
    }
    return true;
  }
}
