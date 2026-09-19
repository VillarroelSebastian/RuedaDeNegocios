import { SetMetadata } from '@nestjs/common';
import type { Role } from '../../../domain/role.js';

export const ROLES_KEY = 'auth:roles';

/**
 * Restricts a route to the listed roles. This replaces the legacy scheme where
 * permissions were inferred from the `/admin/`, `/tecnico/` and `/empresa/`
 * path prefixes, which forced the same resource to be exposed several times.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
