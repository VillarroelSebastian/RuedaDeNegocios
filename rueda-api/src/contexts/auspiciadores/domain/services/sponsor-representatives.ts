import { normalizeEmail } from '../../../../shared/domain/contact.js';
import { ValidationError } from '../../../../shared/domain/errors/domain.error.js';

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Column widths of `auspiciadorpersona`. */
const MAX = { nombreCompleto: 155, cargo: 105 } as const;

export interface RepresentativeInput {
  nombreCompleto?: unknown;
  cargo?: unknown;
  correo?: unknown;
}

export interface Representative {
  nombreCompleto: string;
  cargo: string | null;
  correo: string;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

/**
 * The people of a sponsor who come into the event. Each one gets a credential
 * of their own, so the list and the number of entries the sponsor declared are
 * the same thing counted twice and have to agree.
 */
export function sanitizeRepresentatives(
  input: RepresentativeInput[],
  declaredEntries: number,
): Representative[] {
  const named = input
    .map((person) => ({
      nombreCompleto: text(person?.nombreCompleto),
      cargo: text(person?.cargo) || null,
      correo: normalizeEmail(person?.correo),
    }))
    // An entry with no name at all was never really filled in.
    .filter((person) => person.nombreCompleto.length > 0);

  if (named.length === 0) {
    throw new ValidationError('Registra al menos una persona del auspiciador.');
  }
  if (named.length !== declaredEntries) {
    throw new ValidationError(
      `Declaraste ${declaredEntries} ingreso(s) pero cargaste ${named.length} persona(s). Deben coincidir.`,
    );
  }

  const seen = new Set<string>();
  for (const person of named) {
    if (person.nombreCompleto.length > MAX.nombreCompleto) {
      throw new ValidationError(
        `El nombre de una persona supera los ${MAX.nombreCompleto} caracteres.`,
      );
    }
    if (!person.correo) {
      throw new ValidationError(
        `El correo de ${person.nombreCompleto} es obligatorio para enviar su credencial.`,
      );
    }
    if (!EMAIL_SHAPE.test(person.correo)) {
      throw new ValidationError(`El correo "${person.correo}" no es válido.`);
    }
    if (seen.has(person.correo)) {
      throw new ValidationError(
        `El correo "${person.correo}" está repetido entre los representantes del auspiciador.`,
      );
    }
    seen.add(person.correo);
  }

  return named.map((person) => ({
    ...person,
    cargo: person.cargo ? person.cargo.slice(0, MAX.cargo) : null,
  }));
}
