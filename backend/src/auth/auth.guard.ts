import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';

export type AuthUser = { sub: number; role: string; eventoId?: number | null; eeIds?: number[]; euIds?: number[] };

const PUBLIC_ROUTES = new Set([
  'GET /', 'POST /auth/login', 'POST /auth/solicitar-reset', 'POST /auth/confirmar-reset',
  'GET /public/evento', 'GET /public/verificar-empresa', 'GET /public/credencial',
  'GET /public/credencial-auspiciador', 'GET /public/ciudades', 'POST /public/registro',
  'GET /public/actividades', 'GET /public/paquetes', 'GET /public/galeria',
  'GET /public/cronograma-vivo', 'GET /evento-principal',
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
        empresa_usuario: { where: { estaActivo: 1 }, select: { id: true, empresaevento_id: true } } },
    });
    if (!dbUser || dbUser.rolEvento !== payload.role) throw new UnauthorizedException('La cuenta ya no está habilitada.');
    const eeIds = dbUser.empresa_usuario.map((x) => x.empresaevento_id);
    const euIds = dbUser.empresa_usuario.map((x) => x.id);
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
    if (path.startsWith('/empresa/') && dbUser.rolEvento !== 'EMPRESA')
      throw new ForbiddenException('Se requiere una cuenta de empresa.');

    if (dbUser.rolEvento === 'EMPRESA') {
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
