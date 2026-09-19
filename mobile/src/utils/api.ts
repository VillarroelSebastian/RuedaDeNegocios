import { API_URL } from './userStore';

/**
 * One place that knows the versioned base of the API and the shape of its
 * answers. Every screen used to build `${API_URL}/...` by hand; the `api/v1`
 * prefix, the error shape and the empty `204` now live here.
 *
 * The bearer token is still added by the global `fetch` patch in `userStore`,
 * so this only has to speak the contract.
 */

/** Base of the versioned API. Screens keep writing `${API}/companies`. */
export const API = `${API_URL}/api/v1`;

export interface ApiErrorBody {
  statusCode?: number;
  message?: string | string[];
  error?: string;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Validation failures arrive as a list of messages; anything else as one. */
export function mensajeDeError(body: ApiErrorBody | null, fallback: string): string {
  if (!body?.message) return fallback;
  return Array.isArray(body.message) ? body.message.join(' ') : body.message;
}

async function cuerpoDeError(res: Response): Promise<ApiErrorBody | null> {
  try {
    return (await res.json()) as ApiErrorBody;
  } catch {
    return null;
  }
}

export interface PeticionOptions extends Omit<RequestInit, 'body'> {
  /** Serialised as JSON unless it already is a `FormData`. */
  body?: unknown;
}

/**
 * Calls the API and returns the parsed answer. A `204` answers `null`, because
 * several endpoints now close without a body and reading JSON off them throws.
 */
export async function apiFetch<T = unknown>(
  ruta: string,
  { body, headers, ...init }: PeticionOptions = {},
): Promise<T> {
  const esFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const cabeceras = new Headers(headers);
  if (body !== undefined && !esFormData && !cabeceras.has('Content-Type')) {
    cabeceras.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${API}${ruta}`, {
    ...init,
    headers: cabeceras,
    body: body === undefined ? undefined : esFormData ? (body as BodyInit) : JSON.stringify(body),
  });

  if (!res.ok) {
    const cuerpo = await cuerpoDeError(res);
    throw new ApiError(
      res.status,
      mensajeDeError(cuerpo, 'No se pudo completar la operación.'),
      cuerpo?.error,
    );
  }

  if (res.status === 204) return null as T;

  return (await res.json()) as T;
}

export const apiGet = <T = unknown>(ruta: string, init?: PeticionOptions) =>
  apiFetch<T>(ruta, { ...init, method: 'GET' });

export const apiPost = <T = unknown>(ruta: string, body?: unknown, init?: PeticionOptions) =>
  apiFetch<T>(ruta, { ...init, method: 'POST', body });

export const apiPut = <T = unknown>(ruta: string, body?: unknown, init?: PeticionOptions) =>
  apiFetch<T>(ruta, { ...init, method: 'PUT', body });

export const apiPatch = <T = unknown>(ruta: string, body?: unknown, init?: PeticionOptions) =>
  apiFetch<T>(ruta, { ...init, method: 'PATCH', body });

export const apiDelete = <T = unknown>(ruta: string, init?: PeticionOptions) =>
  apiFetch<T>(ruta, { ...init, method: 'DELETE' });
