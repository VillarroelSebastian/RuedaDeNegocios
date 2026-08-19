import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from './auth.guard.js';
import { jest } from '@jest/globals';

const context = (req: any) => ({ switchToHttp: () => ({ getRequest: () => req }) }) as any;
const user = { id: 7, rolEvento: 'EMPRESA', evento_id: 1,
  empresa_usuario: [{ id: 70, empresaevento_id: 700 }] };

describe('AuthGuard', () => {
  const jwt = { verifyAsync: jest.fn(async () => ({ sub: 7, role: 'EMPRESA' })) } as any;
  const prisma = { usuario: { findFirst: jest.fn(async () => user) } } as any;
  const guard = new AuthGuard(jwt, prisma);

  it('rechaza rutas privadas sin token', async () => {
    await expect(guard.canActivate(context({ method: 'GET', path: '/empresa/perfil', headers: {} })))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rechaza suplantación por eeId', async () => {
    await expect(guard.canActivate(context({ method: 'GET', path: '/empresa/reuniones', headers: { authorization: 'Bearer ok' }, query: { eeId: 999 }, body: {} })))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('acepta la empresa autenticada', async () => {
    await expect(guard.canActivate(context({ method: 'GET', path: '/empresa/reuniones', headers: { authorization: 'Bearer ok' }, query: { eeId: 700 }, body: {} })))
      .resolves.toBe(true);
  });

  it('impide que una empresa use rutas administrativas', async () => {
    await expect(guard.canActivate(context({ method: 'GET', path: '/admin/pagos', headers: { authorization: 'Bearer ok' }, query: {}, body: {} })))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('impide suplantar usuario y participante', async () => {
    await expect(guard.canActivate(context({ method: 'PUT', path: '/empresa/perfil', headers: { authorization: 'Bearer ok' }, query: {}, body: { usuarioId: 8, euId: 71 } })))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('solo deja al técnico administrar contenido permitido', async () => {
    prisma.usuario.findFirst.mockResolvedValueOnce({ id: 9, rolEvento: 'TECNICO', evento_id: 1, empresa_usuario: [] });
    jwt.verifyAsync.mockResolvedValueOnce({ sub: 9, role: 'TECNICO' });
    await expect(guard.canActivate(context({ method: 'POST', path: '/admin/noticias', headers: { authorization: 'Bearer ok' }, query: {}, body: { usuario_id: 9 } }))).resolves.toBe(true);
    prisma.usuario.findFirst.mockResolvedValueOnce({ id: 9, rolEvento: 'TECNICO', evento_id: 1, empresa_usuario: [] });
    jwt.verifyAsync.mockResolvedValueOnce({ sub: 9, role: 'TECNICO' });
    await expect(guard.canActivate(context({ method: 'GET', path: '/admin/pagos', headers: { authorization: 'Bearer ok' }, query: {}, body: {} }))).rejects.toBeInstanceOf(ForbiddenException);
  });
});
