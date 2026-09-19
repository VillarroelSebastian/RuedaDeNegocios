import { CLAVES_SESION } from "@/lib/api";

/**
 * The session as the whole app already reads it.
 *
 * The API renamed every field of its answer — `correo` became `email`,
 * `empresaeventoId` became `companyEventId`, and so on. Rather than rename the
 * hundreds of places that read the stored session, the answer is translated
 * once, here, and stored in the shape the screens already expect.
 */
export interface SesionUsuario {
  token: string;
  id: number;
  correo: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  telefono: string;
  rolEvento: string;
  urlFotoPerfil: string;
  evento_id: number | null;
  esResponsable?: boolean;
  empresaeventoId?: number;
  empresaUsuarioId?: number;
}

/** What `POST /auth/sessions` answers with. */
export interface RespuestaSesion {
  token: string;
  id: number;
  email: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  telefono: string;
  role: string;
  urlFotoPerfil: string;
  assignedEventId: number | null;
  isResponsible?: boolean;
  companyEventId?: number;
  companyUserId?: number;
}

export type ClaveSesion = (typeof CLAVES_SESION)[number];

export function desdeApi(respuesta: RespuestaSesion): SesionUsuario {
  return {
    token: respuesta.token,
    id: respuesta.id,
    correo: respuesta.email,
    nombres: respuesta.nombres,
    apellidoPaterno: respuesta.apellidoPaterno,
    apellidoMaterno: respuesta.apellidoMaterno,
    telefono: respuesta.telefono,
    rolEvento: respuesta.role,
    urlFotoPerfil: respuesta.urlFotoPerfil,
    evento_id: respuesta.assignedEventId,
    ...(respuesta.isResponsible !== undefined && { esResponsable: respuesta.isResponsible }),
    ...(respuesta.companyEventId !== undefined && {
      empresaeventoId: respuesta.companyEventId,
      empresaUsuarioId: respuesta.companyUserId,
    }),
  };
}

/** Which of the three sessions a role is stored under. */
export function claveDeRol(rolEvento: string): ClaveSesion | null {
  if (rolEvento === "ADMINISTRADOR") return "adminUser";
  if (rolEvento === "TECNICO" || rolEvento === "TECNICO_EVENTOS") return "tecnicoUser";
  if (rolEvento === "EMPRESA") return "empresaUser";

  return null;
}

export function limpiarSesiones(): void {
  for (const clave of CLAVES_SESION) localStorage.removeItem(clave);
}

/** Only one session is held at a time, so the previous ones are dropped. */
export function guardarSesion(sesion: SesionUsuario): ClaveSesion | null {
  const clave = claveDeRol(sesion.rolEvento);
  limpiarSesiones();
  if (clave) localStorage.setItem(clave, JSON.stringify(sesion));

  return clave;
}

export function leerSesion(clave: ClaveSesion): SesionUsuario | null {
  try {
    return JSON.parse(localStorage.getItem(clave) || "null") as SesionUsuario | null;
  } catch {
    return null;
  }
}

/** The session in use, whichever role it belongs to. */
export function sesionActiva(): SesionUsuario | null {
  for (const clave of CLAVES_SESION) {
    const sesion = leerSesion(clave);
    if (sesion?.token) return sesion;
  }

  return null;
}
