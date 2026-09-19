import { Injectable } from '@nestjs/common';
import type { Role } from '../../../../shared/domain/role.js';
import { PrismaService } from '../../../../shared/infrastructure/persistence/prisma.service.js';
import { UserAccount } from '../../domain/entities/user-account.entity.js';
import type {
  ResetRecipient,
  ResetTokenCandidate,
  UserAccountRepositoryPort,
} from '../../domain/ports/user-account.repository.port.js';

@Injectable()
export class PrismaUserAccountRepository implements UserAccountRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveByEmail(email: string): Promise<UserAccount | null> {
    const row = await this.prisma.usuario.findFirst({ where: { correo: email, estaActivo: 1 } });
    return row ? toDomain(row) : null;
  }

  async findActiveById(id: number): Promise<UserAccount | null> {
    const row = await this.prisma.usuario.findFirst({ where: { id, estaActivo: 1 } });
    return row ? toDomain(row) : null;
  }

  async updatePassword(userId: number, hashedPassword: string): Promise<void> {
    await this.prisma.usuario.update({
      where: { id: userId },
      data: { contrasenia: hashedPassword, creadoModificadoFecha: new Date() },
    });
  }

  async clearAssignedEvent(userId: number): Promise<void> {
    await this.prisma.usuario.update({ where: { id: userId }, data: { evento_id: null } });
  }

  async findLatestActiveRecipientByEmail(email: string): Promise<ResetRecipient | null> {
    // Newest first, so historical duplicates of the same email are skipped.
    const row = await this.prisma.usuario.findFirst({
      where: { correo: email, estaActivo: 1 },
      select: { id: true, correo: true, nombres: true },
      orderBy: { id: 'desc' },
    });
    return row ? { id: row.id, email: row.correo, nombres: row.nombres } : null;
  }

  async saveResetToken(userId: number, hashedCode: string, expiresAt: Date): Promise<void> {
    await this.prisma.usuario.update({
      where: { id: userId },
      data: { resetToken: hashedCode, resetTokenExpiry: expiresAt },
    });
  }

  async findResetCandidatesByEmail(email: string): Promise<ResetTokenCandidate[]> {
    const rows = await this.prisma.usuario.findMany({
      where: { correo: email, estaActivo: 1, resetToken: { not: null } },
      select: { id: true, resetToken: true, resetTokenExpiry: true },
      orderBy: { id: 'desc' },
    });
    return rows.map((row) => ({
      id: row.id,
      hashedCode: row.resetToken!,
      expiresAt: row.resetTokenExpiry,
    }));
  }

  async completePasswordReset(userId: number, hashedPassword: string): Promise<void> {
    await this.prisma.usuario.update({
      where: { id: userId },
      data: {
        contrasenia: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
        creadoModificadoFecha: new Date(),
      },
    });
  }
}

interface UsuarioRow {
  id: number;
  correo: string;
  contrasenia: string;
  rolEvento: string;
  evento_id: number | null;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  telefono: string;
  urlFotoPerfil: string;
}

function toDomain(row: UsuarioRow): UserAccount {
  return new UserAccount({
    id: row.id,
    email: row.correo,
    storedPassword: row.contrasenia,
    role: row.rolEvento as Role,
    assignedEventId: row.evento_id,
    nombres: row.nombres,
    apellidoPaterno: row.apellidoPaterno,
    apellidoMaterno: row.apellidoMaterno,
    telefono: row.telefono,
    urlFotoPerfil: row.urlFotoPerfil,
  });
}
