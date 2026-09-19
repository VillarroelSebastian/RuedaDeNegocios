/**
 * The session as the whole app already reads it.
 *
 * The API renamed every field of its answer — `correo` became `email`,
 * `empresaeventoId` became `companyEventId`, and so on. Rather than rename the
 * dozens of screens that read the stored session, the answer is translated once
 * here and stored in the shape the screens already expect.
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
