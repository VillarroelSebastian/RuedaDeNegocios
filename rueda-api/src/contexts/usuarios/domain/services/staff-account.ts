import { normalizeEmail, normalizePhone } from '../../../../shared/domain/contact.js';
import { ValidationError } from '../../../../shared/domain/errors/domain.error.js';
import { ROLES } from '../../../../shared/domain/role.js';

/** The two roles the event team is made of. */
export const TECHNICIAN_ROLES = [ROLES.TECNICO, ROLES.TECNICO_EVENTOS] as const;

export type TechnicianRole = (typeof TECHNICIAN_ROLES)[number];

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PHONE_DIGITS = 7;

/** Column widths of `usuario`. */
const MAX = { nombres: 105, apellido: 65, correo: 105, telefono: 45, foto: 505 } as const;

const REQUIRED_NAME = 'Nombres y apellido paterno son obligatorios';
const INVALID_EMAIL = 'El correo no es valido';

export interface TechnicianAccountInput {
  nombres?: unknown;
  apellidoPaterno?: unknown;
  apellidoMaterno?: unknown;
  correo?: unknown;
  telefono?: unknown;
  urlFotoPerfil?: unknown;
  rolEvento?: unknown;
}

export interface TechnicianAccount {
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  correo: string;
  /** As typed, which is what staff calls back. */
  telefono: string;
  /** Digits only, which is what duplicate checks compare. */
  telefonoDigits: string;
  urlFotoPerfil: string | null;
  rolEvento: TechnicianRole;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function assertEmail(correo: string): void {
  if (!EMAIL_SHAPE.test(correo)) throw new ValidationError(INVALID_EMAIL);
}

export function sanitizeTechnicianAccount(input: TechnicianAccountInput): TechnicianAccount {
  const nombres = text(input.nombres).slice(0, MAX.nombres);
  const apellidoPaterno = text(input.apellidoPaterno).slice(0, MAX.apellido);
  if (!nombres || !apellidoPaterno) throw new ValidationError(REQUIRED_NAME);

  const correo = normalizeEmail(input.correo).slice(0, MAX.correo);
  assertEmail(correo);

  const telefono = text(input.telefono).slice(0, MAX.telefono);
  const telefonoDigits = normalizePhone(telefono);
  if (telefonoDigits.length < MIN_PHONE_DIGITS) {
    throw new ValidationError('El telefono no es valido');
  }

  // Anything other than the two technician roles is not a technician account.
  const requested = text(input.rolEvento).toUpperCase();
  const rolEvento: TechnicianRole =
    requested === ROLES.TECNICO_EVENTOS ? ROLES.TECNICO_EVENTOS : ROLES.TECNICO;

  return {
    nombres,
    apellidoPaterno,
    apellidoMaterno: text(input.apellidoMaterno).slice(0, MAX.apellido) || null,
    correo,
    telefono,
    telefonoDigits,
    urlFotoPerfil: text(input.urlFotoPerfil).slice(0, MAX.foto) || null,
    rolEvento,
  };
}

export interface ProfilePatchInput {
  nombres?: unknown;
  apellidoPaterno?: unknown;
  apellidoMaterno?: unknown;
  correo?: unknown;
  telefono?: unknown;
  urlFotoPerfil?: unknown;
}

export interface CurrentProfile {
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  correo: string;
  telefono: string;
}

export interface ProfilePatch {
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  correo: string;
  telefono: string;
  urlFotoPerfil: string | null;
  /** True when the address really changed, which is what forces a new password. */
  correoCambio: boolean;
}

/**
 * A profile edit only touches what it names. Everything it leaves out keeps the
 * value it already had, so saving one field never quietly blanks another.
 */
export function sanitizeProfilePatch(
  input: ProfilePatchInput,
  current: CurrentProfile,
): ProfilePatch {
  const nombres = (input.nombres === undefined ? current.nombres : text(input.nombres)).slice(
    0,
    MAX.nombres,
  );
  const apellidoPaterno = (
    input.apellidoPaterno === undefined ? current.apellidoPaterno : text(input.apellidoPaterno)
  ).slice(0, MAX.apellido);
  if (!nombres || !apellidoPaterno) throw new ValidationError(REQUIRED_NAME);

  const correo = (
    input.correo === undefined ? current.correo : normalizeEmail(input.correo)
  ).slice(0, MAX.correo);
  assertEmail(correo);

  const apellidoMaterno =
    input.apellidoMaterno === undefined
      ? current.apellidoMaterno
      : text(input.apellidoMaterno).slice(0, MAX.apellido) || null;

  return {
    nombres,
    apellidoPaterno,
    apellidoMaterno,
    correo,
    telefono: (input.telefono === undefined
      ? current.telefono
      : text(input.telefono)
    ).slice(0, MAX.telefono),
    urlFotoPerfil: text(input.urlFotoPerfil).slice(0, MAX.foto) || null,
    correoCambio: normalizeEmail(current.correo) !== correo,
  };
}
