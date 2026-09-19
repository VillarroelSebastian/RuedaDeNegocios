import { Injectable } from '@nestjs/common';
import type { Role } from '../../../../shared/domain/role.js';
import { PrismaService } from '../../../../shared/infrastructure/persistence/prisma.service.js';
import type {
  SessionRepositoryPort,
  SessionSnapshot,
} from '../../domain/ports/session.repository.port.js';
import { GRANTED_ENROLLMENT } from './prisma-company-membership.repository.js';

@Injectable()
export class PrismaSessionRepository implements SessionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveSession(userId: number): Promise<SessionSnapshot | null> {
    const row = await this.prisma.usuario.findFirst({
      where: { id: userId, estaActivo: 1 },
      select: {
        id: true,
        rolEvento: true,
        evento_id: true,
        empresa_usuario: {
          where: { estaActivo: 1, empresaevento: GRANTED_ENROLLMENT },
          select: { id: true, empresaevento_id: true },
        },
      },
    });
    if (!row) return null;

    return {
      id: row.id,
      role: row.rolEvento as Role,
      assignedEventId: row.evento_id,
      grantedMemberships: row.empresa_usuario.map((item) => ({
        id: item.id,
        companyEventId: item.empresaevento_id,
      })),
    };
  }

  async findPrincipalEventId(): Promise<number | null> {
    const evento = await this.prisma.evento.findFirst({
      where: { esPrincipal: 1, estaActivo: { not: 0 } },
      select: { id: true },
    });
    return evento?.id ?? null;
  }
}
