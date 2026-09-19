/** Values stored in `usuario.rolEvento`. */
export const ROLES = {
  ADMIN: 'ADMINISTRADOR',
  TECNICO: 'TECNICO',
  TECNICO_EVENTOS: 'TECNICO_EVENTOS',
  EMPRESA: 'EMPRESA',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/** Event team: the roles the legacy API gated behind `/tecnico/` and `/staff/`. */
export const STAFF_ROLES: readonly Role[] = [ROLES.ADMIN, ROLES.TECNICO, ROLES.TECNICO_EVENTOS];

/** Technical staff without admin rights; their event is always the principal one. */
export const TECNICO_ROLES: readonly Role[] = [ROLES.TECNICO, ROLES.TECNICO_EVENTOS];

export function isRole(value: string): value is Role {
  return (Object.values(ROLES) as string[]).includes(value);
}
