import type { UserAccount } from '../entities/user-account.entity.js';

export interface ResetTokenCandidate {
  id: number;
  hashedCode: string;
  expiresAt: Date | null;
}

export interface ResetRecipient {
  id: number;
  email: string;
  nombres: string;
}

export interface UserAccountRepositoryPort {
  findActiveByEmail(email: string): Promise<UserAccount | null>;
  findActiveById(id: number): Promise<UserAccount | null>;

  updatePassword(userId: number, hashedPassword: string): Promise<void>;
  clearAssignedEvent(userId: number): Promise<void>;

  /** Most recent active account for an email, to skip historical duplicates. */
  findLatestActiveRecipientByEmail(email: string): Promise<ResetRecipient | null>;
  saveResetToken(userId: number, hashedCode: string, expiresAt: Date): Promise<void>;
  findResetCandidatesByEmail(email: string): Promise<ResetTokenCandidate[]>;
  /** Sets the new password and clears the reset token in one write. */
  completePasswordReset(userId: number, hashedPassword: string): Promise<void>;
}

export const USER_ACCOUNT_REPOSITORY = Symbol('UserAccountRepositoryPort');
