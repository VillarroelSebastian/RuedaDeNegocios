/**
 * One place that knows where the API lives and what its answers look like.
 *
 * Every call used to build its own base URL: the same line was repeated in
 * sixty-eight files. It now lives here, together with the `api/v1` prefix, the
 * shape of an error and what to do when a session expires.
 */

const HOST = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";

/** Base of the versioned API. Call sites keep writing `${API}/companies`. */
export const API = `${HOST}/api/v1`;

/** Host without the prefix, for sockets and for static files it serves. */
export const API_HOST = HOST;

/** The failure shape the API answers with. */
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
    this.name = "ApiError";
  }
}

/** Validation failures arrive as a list of messages; anything else as one. */
export function mensajeDeError(body: ApiErrorBody | null, fallback: string): string {
  if (!body?.message) return fallback;
  return Array.isArray(body.message) ? body.message.join(" ") : body.message;
}

async function cuerpoDeError(res: Response): Promise<ApiErrorBody | null> {
  try {
    return (await res.json()) as ApiErrorBody;
  } catch {
    return null;
  }
}

/** Storage keys of the three sessions the app can hold, one per role. */
export const CLAVES_SESION = ["adminUser", "tecnicoUser", "empresaUser"] as const;

/**
 * A rejected token means the session is over: a stale one from before the
 * migration looks exactly like a valid one until the API turns it down.
 */
function cerrarSesion(): void {
  if (typeof window === "undefined") return;

  for (const clave of CLAVES_SESION) localStorage.removeItem(clave);
  if (!window.location.pathname.startsWith("/auth/")) {
    window.location.href = "/auth/login";
  }
}

export interface PeticionOptions extends Omit<RequestInit, "body"> {
  /** Serialised as JSON unless it already is a `FormData`. */
  body?: unknown;
  /** Set to false to handle a 401 by hand instead of closing the session. */
  cerrarSesionEn401?: boolean;
}

/**
 * Calls the API and gives back the parsed answer.
 *
 * A `204` answers `null`: several endpoints now close without a body, and
 * reading JSON off them used to throw.
 */
export async function apiFetch<T = unknown>(
  ruta: string,
  { body, cerrarSesionEn401 = true, headers, ...init }: PeticionOptions = {},
): Promise<T> {
  const esFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const cabeceras = new Headers(headers);
  if (body !== undefined && !esFormData && !cabeceras.has("Content-Type")) {
    cabeceras.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API}${ruta}`, {
    ...init,
    headers: cabeceras,
    body: body === undefined ? undefined : esFormData ? body : JSON.stringify(body),
  });

  if (res.status === 401 && cerrarSesionEn401) {
    cerrarSesion();
    throw new ApiError(401, "Tu sesión expiró. Vuelve a iniciar sesión.", "UNAUTHORIZED");
  }

  if (!res.ok) {
    const cuerpo = await cuerpoDeError(res);
    throw new ApiError(
      res.status,
      mensajeDeError(cuerpo, "No se pudo completar la operación."),
      cuerpo?.error,
    );
  }

  if (res.status === 204) return null as T;

  return (await res.json()) as T;
}

export const apiGet = <T = unknown>(ruta: string, init?: PeticionOptions) =>
  apiFetch<T>(ruta, { ...init, method: "GET" });

export const apiPost = <T = unknown>(ruta: string, body?: unknown, init?: PeticionOptions) =>
  apiFetch<T>(ruta, { ...init, method: "POST", body });

export const apiPut = <T = unknown>(ruta: string, body?: unknown, init?: PeticionOptions) =>
  apiFetch<T>(ruta, { ...init, method: "PUT", body });

export const apiPatch = <T = unknown>(ruta: string, body?: unknown, init?: PeticionOptions) =>
  apiFetch<T>(ruta, { ...init, method: "PATCH", body });

export const apiDelete = <T = unknown>(ruta: string, init?: PeticionOptions) =>
  apiFetch<T>(ruta, { ...init, method: "DELETE" });
