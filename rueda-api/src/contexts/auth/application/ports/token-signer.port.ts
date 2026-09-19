import type { Role } from '../../../../shared/domain/role.js';

/** Claims carried by the access token. */
export interface AccessTokenClaims {
  sub: number;
  role: Role;
  eventoId: number | null;
  /** `empresaevento` ids the caller may act on. */
  eeIds: number[];
  /** `empresa_usuario` ids the caller may act on. */
  euIds: number[];
}

export interface TokenSignerPort {
  sign(claims: AccessTokenClaims): Promise<string>;
  verify(token: string): Promise<AccessTokenClaims>;
}

export const TOKEN_SIGNER_PORT = Symbol('TokenSignerPort');
