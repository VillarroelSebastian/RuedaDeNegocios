import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'auth:public';

/**
 * Opens a route to unauthenticated callers. Routes are private by default, so
 * forgetting this decorator fails closed instead of exposing data.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
