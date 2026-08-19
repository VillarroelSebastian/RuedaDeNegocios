import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly attempts = new Map<string, number[]>();
  constructor(private readonly prisma: PrismaService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<any>();
    if (!['/auth/login', '/auth/solicitar-reset', '/auth/confirmar-reset', '/public/imagenes/upload'].includes(req.path)) return true;
    const now = Date.now(), windowMs = 15 * 60_000;
    const key = `${req.ip}:${req.path}:${String(req.body?.correo || '').trim().toLowerCase()}`;
    const keyHash = createHash('sha256').update(key).digest('hex');
    try {
      const rows = await this.prisma.$queryRaw<Array<{ total: bigint }>>`SELECT COUNT(*)::bigint AS total FROM intento_auth WHERE clave = ${keyHash} AND fecha > NOW() - INTERVAL '15 minutes'`;
      if (Number(rows[0]?.total || 0) >= 8) throw new HttpException('Demasiados intentos. Intenta nuevamente en 15 minutos.', HttpStatus.TOO_MANY_REQUESTS);
      await this.prisma.$executeRaw`INSERT INTO intento_auth (clave, fecha) VALUES (${keyHash}, NOW())`;
      return true;
    } catch (error) {
      if (error instanceof HttpException) throw error;
    }
    const recent = (this.attempts.get(key) || []).filter((t) => now - t < windowMs);
    if (recent.length >= 8) throw new HttpException('Demasiados intentos. Intenta nuevamente en 15 minutos.', HttpStatus.TOO_MANY_REQUESTS);
    recent.push(now); this.attempts.set(key, recent);
    return true;
  }
}
