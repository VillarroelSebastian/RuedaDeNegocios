import { Injectable, Logger } from '@nestjs/common';
import type { AttemptLimiterPort } from '../../application/ports/attempt-limiter.port.js';
import { PrismaService } from '../persistence/prisma.service.js';

/**
 * Persists attempts in `intento_auth` so the budget is shared across processes.
 * If the table is unreachable the adapter degrades to an in-process window
 * rather than letting every attempt through.
 */
@Injectable()
export class PrismaAttemptLimiterAdapter implements AttemptLimiterPort {
  private readonly logger = new Logger(PrismaAttemptLimiterAdapter.name);
  private readonly fallback = new Map<string, number[]>();

  constructor(private readonly prisma: PrismaService) {}

  async countRecentAttempts(key: string, windowMs: number): Promise<number> {
    const since = new Date(Date.now() - windowMs);
    try {
      const rows = await this.prisma.$queryRaw<{ total: bigint }[]>`
        SELECT COUNT(*)::bigint AS total FROM intento_auth WHERE clave = ${key} AND fecha > ${since}
      `;
      return Number(rows[0]?.total ?? 0);
    } catch (error) {
      this.logger.warn(`intento_auth unavailable, falling back to in-process counting: ${String(error)}`);
      return this.countInMemory(key, windowMs);
    }
  }

  async recordAttempt(key: string): Promise<void> {
    try {
      await this.prisma.$executeRaw`INSERT INTO intento_auth (clave, fecha) VALUES (${key}, NOW())`;
    } catch {
      this.fallback.set(key, [...(this.fallback.get(key) ?? []), Date.now()]);
    }
  }

  private countInMemory(key: string, windowMs: number): number {
    const cutoff = Date.now() - windowMs;
    const recent = (this.fallback.get(key) ?? []).filter((at) => at > cutoff);
    this.fallback.set(key, recent);
    return recent.length;
  }
}
