import { normalizeEmail, normalizePhone } from '../../../../shared/domain/contact.js';
import { ValidationError } from '../../../../shared/domain/errors/domain.error.js';

export interface ParticipantApplicationInput {
  nombres?: unknown;
  apellidoPaterno?: unknown;
  apellidoMaterno?: unknown;
  correo?: unknown;
  telefono?: unknown;
  cargo?: unknown;
  esResponsable?: unknown;
}

export interface ParticipantApplication {
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  correo: string;
  /** As typed, which is what staff calls back. */
  telefono: string;
  /** Digits only, which is what duplicate checks compare. */
  telefonoDigits: string;
  cargo: string;
  esResponsable: boolean;
}

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PHONE_DIGITS = 7;

/** Column widths of `usuario` and `empresa_usuario`. */
const MAX = { nombres: 105, apellido: 65, cargo: 55, telefono: 45 } as const;

/** A person still has to be listed even when the form was filled in carelessly. */
const UNNAMED = 'Sin nombre';
const UNTITLED_SURNAME = 'Participante';

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Turns the submitted roster into people the registration can create, refusing
 * anything the event could not tell apart later: a repeated email, a repeated
 * phone, or a roster with nobody answering for the company.
 */
export function sanitizeParticipantApplications(
  input: ParticipantApplicationInput[],
): ParticipantApplication[] {
  if (input.length === 0) {
    throw new ValidationError('Debes registrar al menos un participante.');
  }

  const emails = new Set<string>();
  const phones = new Set<string>();
  const participants: ParticipantApplication[] = [];

  for (const [index, entry] of input.entries()) {
    const position = index + 1;

    const correo = normalizeEmail(entry.correo);
    if (!EMAIL_SHAPE.test(correo)) {
      throw new ValidationError(`El correo del participante ${position} no es valido.`);
    }
    if (emails.has(correo)) {
      throw new ValidationError(`El correo ${correo} esta repetido entre los participantes.`);
    }

    const telefono = text(entry.telefono).slice(0, MAX.telefono);
    const telefonoDigits = normalizePhone(telefono);
    if (telefonoDigits.length < MIN_PHONE_DIGITS) {
      throw new ValidationError(`El telefono del participante ${position} no es valido.`);
    }
    if (phones.has(telefonoDigits)) {
      throw new ValidationError(`El telefono del participante ${position} esta repetido.`);
    }

    emails.add(correo);
    phones.add(telefonoDigits);
    participants.push({
      nombres: text(entry.nombres).slice(0, MAX.nombres) || UNNAMED,
      apellidoPaterno: text(entry.apellidoPaterno).slice(0, MAX.apellido) || UNTITLED_SURNAME,
      apellidoMaterno: text(entry.apellidoMaterno).slice(0, MAX.apellido) || null,
      correo,
      telefono,
      telefonoDigits,
      cargo: text(entry.cargo).slice(0, MAX.cargo),
      esResponsable: entry.esResponsable === true,
    });
  }

  // The legacy form only emailed whoever was flagged as the one in charge, and
  // left an enrollment with nobody in charge unusable: no one could then add
  // participants, book meetings or answer for the company.
  const inCharge = participants.filter((participant) => participant.esResponsable).length;
  if (inCharge === 0) {
    throw new ValidationError('Debes indicar quién es el encargado de la empresa.');
  }
  if (inCharge > 1) {
    throw new ValidationError('Solo una persona puede ser el encargado de la empresa.');
  }

  return participants;
}
