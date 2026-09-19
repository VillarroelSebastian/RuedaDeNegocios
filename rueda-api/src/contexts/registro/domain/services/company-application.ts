import { normalizeEmail, normalizePhone } from '../../../../shared/domain/contact.js';
import { ValidationError } from '../../../../shared/domain/errors/domain.error.js';

/**
 * What a company types into the public registration form. Nothing here has been
 * checked yet, so every field arrives as `unknown` and leaves either sanitised
 * or refused. Refusing happens before anything is written, so a bad field never
 * leaves half an enrollment behind.
 */
export interface CompanyApplicationInput {
  nombre?: unknown;
  rubro?: unknown;
  correoCorporativo?: unknown;
  telefonoWhatsapp?: unknown;
  sitioWeb?: unknown;
  descripcion?: unknown;
  oferta?: unknown;
  demanda?: unknown;
  interesesBusqueda?: unknown;
  paisNombre?: unknown;
  ciudadNombre?: unknown;
}

export interface CompanyApplication {
  nombre: string;
  rubro: string;
  correoCorporativo: string;
  /** As typed, which is what staff calls back. */
  telefonoWhatsapp: string;
  /** Digits only, which is what duplicate checks compare. */
  telefonoDigits: string;
  sitioWeb: string | null;
  descripcion: string | null;
  oferta: string | null;
  demanda: string | null;
  interesesBusqueda: string | null;
  paisNombre: string;
  ciudadNombre: string;
}

const NAME_MIN_LENGTH = 3;
const NAME_MAX_LENGTH = 55;
/** Letters, digits and the punctuation a registered company name may carry. */
const NAME_CHARSET = /^[a-zA-ZÀ-ÿ0-9\s.,&\-'()]+$/;
const NAME_MIN_LETTERS = 2;
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PHONE_DIGITS = 7;

/** Column widths, so an oversized field is trimmed instead of failing the insert. */
const MAX = {
  rubro: 55,
  sitioWeb: 300,
  descripcion: 1000,
  oferta: 500,
  demanda: 500,
  interesesBusqueda: 600,
  place: 45,
} as const;

/** The event is held in Trinidad, Beni: most companies registering are local. */
const DEFAULT_COUNTRY = 'Bolivia';
const DEFAULT_CITY = 'Trinidad';

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** Optional free text: blank means nothing stored, never an empty string. */
function optionalText(value: unknown, maxLength: number): string | null {
  const trimmed = text(value).slice(0, maxLength);
  return trimmed.length > 0 ? trimmed : null;
}

function place(value: unknown, fallback: string): string {
  return (text(value) || fallback).slice(0, MAX.place);
}

export function sanitizeCompanyApplication(input: CompanyApplicationInput): CompanyApplication {
  const nombre = text(input.nombre).replace(/\s+/g, ' ');
  if (nombre.length < NAME_MIN_LENGTH || nombre.length > NAME_MAX_LENGTH) {
    throw new ValidationError('El nombre de la empresa debe tener entre 3 y 55 caracteres.');
  }
  if (!NAME_CHARSET.test(nombre)) {
    throw new ValidationError('El nombre de la empresa contiene caracteres no permitidos.');
  }
  // A name made of digits and punctuation is not a name anyone can read out.
  if ((nombre.match(/[a-zA-ZÀ-ÿ]/g) ?? []).length < NAME_MIN_LETTERS) {
    throw new ValidationError('El nombre de la empresa debe incluir al menos 2 letras.');
  }

  const correoCorporativo = normalizeEmail(input.correoCorporativo);
  if (!EMAIL_SHAPE.test(correoCorporativo)) {
    throw new ValidationError('El correo corporativo no es válido.');
  }

  const telefonoWhatsapp = text(input.telefonoWhatsapp);
  const telefonoDigits = normalizePhone(telefonoWhatsapp);
  if (telefonoDigits.length < MIN_PHONE_DIGITS) {
    throw new ValidationError('El telefono/WhatsApp de la empresa no es valido.');
  }

  return {
    nombre,
    rubro: text(input.rubro).slice(0, MAX.rubro),
    correoCorporativo,
    telefonoWhatsapp,
    telefonoDigits,
    sitioWeb: optionalText(input.sitioWeb, MAX.sitioWeb),
    descripcion: optionalText(input.descripcion, MAX.descripcion),
    oferta: optionalText(input.oferta, MAX.oferta),
    demanda: optionalText(input.demanda, MAX.demanda),
    interesesBusqueda: optionalText(input.interesesBusqueda, MAX.interesesBusqueda),
    paisNombre: place(input.paisNombre, DEFAULT_COUNTRY),
    ciudadNombre: place(input.ciudadNombre, DEFAULT_CITY),
  };
}
