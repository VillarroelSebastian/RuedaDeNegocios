import { HttpException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { RateLimitGuard } from './rate-limit.guard.js';

const ctx = (correo = 'a@b.com') => ({ switchToHttp: () => ({ getRequest: () => ({ path: '/auth/login', ip: '127.0.0.1', body: { correo } }) }) }) as any;

describe('RateLimitGuard', () => {
  it('registra el intento en almacenamiento persistente', async () => {
    const prisma = { $queryRaw: jest.fn(async () => [{ total: 0n }]), $executeRaw: jest.fn(async () => 1) } as any;
    await expect(new RateLimitGuard(prisma).canActivate(ctx())).resolves.toBe(true);
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
  });

  it('bloquea al alcanzar ocho intentos', async () => {
    const prisma = { $queryRaw: jest.fn(async () => [{ total: 8n }]), $executeRaw: jest.fn() } as any;
    await expect(new RateLimitGuard(prisma).canActivate(ctx())).rejects.toBeInstanceOf(HttpException);
  });
});
