import { Controller, Get, INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthGuard } from '../src/auth/auth.guard.js';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../src/prisma/prisma.service.js';

@Controller()
class SecurityProbeController {
  @Get('admin/probe') admin() { return { ok: true }; }
  @Get('empresa/probe') empresa() { return { ok: true }; }
}

describe('seguridad HTTP (e2e)', () => {
  let app: INestApplication;
  const jwt = { verifyAsync: async (token: string) => token === 'admin' ? { sub: 1, role: 'ADMINISTRADOR' } : { sub: 2, role: 'EMPRESA' } };
  const prisma = { usuario: { findFirst: async ({ where }: any) => where.id === 1
    ? { id: 1, rolEvento: 'ADMINISTRADOR', evento_id: 1, empresa_usuario: [] }
    : { id: 2, rolEvento: 'EMPRESA', evento_id: 1, empresa_usuario: [{ id: 20, empresaevento_id: 200 }] } } };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ controllers: [SecurityProbeController], providers: [
      AuthGuard, { provide: JwtService, useValue: jwt }, { provide: PrismaService, useValue: prisma },
      { provide: APP_GUARD, useExisting: AuthGuard },
    ] }).compile();
    app = mod.createNestApplication(); await app.init();
  });
  afterAll(() => app.close());

  it('devuelve 401 sin sesión', () => request(app.getHttpServer()).get('/admin/probe').expect(401));
  it('devuelve 403 si empresa intenta administrar', () => request(app.getHttpServer()).get('/admin/probe').set('Authorization', 'Bearer empresa').expect(403));
  it('permite al administrador', () => request(app.getHttpServer()).get('/admin/probe').set('Authorization', 'Bearer admin').expect(200));
  it('permite a la empresa en su prefijo', () => request(app.getHttpServer()).get('/empresa/probe').set('Authorization', 'Bearer empresa').expect(200));
});
