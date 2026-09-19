import { ValidationError } from '../../../../shared/domain/errors/domain.error.js';

/** How good a table the package buys. */
export const TABLE_LEVELS = ['NORMAL', 'PREFERENCIAL', 'VIP'] as const;
/** How the company takes part. */
export const PARTICIPATION_TYPES = ['PRESENCIAL', 'VIRTUAL', 'HIBRIDO'] as const;

export type TableLevel = (typeof TABLE_LEVELS)[number];
export type ParticipationType = (typeof PARTICIPATION_TYPES)[number];

/** Column widths of `paquete`. */
const MAX = {
  nombre: 105,
  objetivo: 205,
  descripcion: 505,
  contenido: 2000,
  urlQR: 505,
} as const;

export interface PackageDefinitionInput {
  nombre?: unknown;
  objetivo?: unknown;
  descripcion?: unknown;
  contenido?: unknown;
  costo?: unknown;
  credencialesIncluidas?: unknown;
  maxParticipantes?: unknown;
  nivelMesa?: unknown;
  tipoParticipacion?: unknown;
  apareceEnCatalogo?: unknown;
  logoEnWeb?: unknown;
  destacadoEnListados?: unknown;
  urlQR?: unknown;
  orden?: unknown;
}

export interface PackageDefinition {
  nombre: string;
  objetivo: string | null;
  descripcion: string | null;
  /** Benefits, one bullet per line. */
  contenido: string | null;
  costo: number;
  credencialesIncluidas: number;
  maxParticipantes: number;
  nivelMesa: TableLevel;
  tipoParticipacion: ParticipationType;
  apareceEnCatalogo: boolean;
  logoEnWeb: boolean;
  destacadoEnListados: boolean;
  urlQR: string | null;
  orden: number;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.replace(/[^\S\n]+/g, ' ').trim() : '';
}

function optionalText(value: unknown, maxLength: number): string | null {
  const trimmed = text(value).slice(0, maxLength);
  return trimmed.length > 0 ? trimmed : null;
}

function flag(value: unknown, byDefault: boolean): boolean {
  return value === undefined || value === null ? byDefault : Boolean(value);
}

export function sanitizePackageDefinition(input: PackageDefinitionInput): PackageDefinition {
  const nombre = text(input.nombre).slice(0, MAX.nombre);
  if (!nombre) throw new ValidationError('El nombre del paquete es obligatorio.');

  const costo = Number(input.costo);
  if (!Number.isFinite(costo) || costo < 0) {
    throw new ValidationError('El costo debe ser un número mayor o igual a 0.');
  }

  const credencialesIncluidas = Number(input.credencialesIncluidas);
  if (!Number.isInteger(credencialesIncluidas) || credencialesIncluidas < 1) {
    throw new ValidationError('Las credenciales incluidas deben ser al menos 1.');
  }

  // A cap below what the package already includes would stop a company loading
  // even the credentials it paid for.
  const maxParticipantes = Number(input.maxParticipantes ?? credencialesIncluidas);
  if (!Number.isInteger(maxParticipantes) || maxParticipantes < credencialesIncluidas) {
    throw new ValidationError(
      `El máximo de participantes (${maxParticipantes}) no puede ser menor que las ${credencialesIncluidas} credenciales incluidas.`,
    );
  }

  const nivelMesa = (text(input.nivelMesa).toUpperCase() || 'NORMAL') as TableLevel;
  if (!TABLE_LEVELS.includes(nivelMesa)) {
    throw new ValidationError('El nivel de mesa debe ser NORMAL, PREFERENCIAL o VIP.');
  }

  const tipoParticipacion = (text(input.tipoParticipacion).toUpperCase() ||
    'PRESENCIAL') as ParticipationType;
  if (!PARTICIPATION_TYPES.includes(tipoParticipacion)) {
    throw new ValidationError('La modalidad debe ser PRESENCIAL, VIRTUAL o HIBRIDO.');
  }

  return {
    nombre,
    objetivo: optionalText(input.objetivo, MAX.objetivo),
    descripcion: optionalText(input.descripcion, MAX.descripcion),
    contenido: benefitsOf(input.contenido),
    costo,
    credencialesIncluidas,
    maxParticipantes,
    nivelMesa,
    tipoParticipacion,
    apareceEnCatalogo: flag(input.apareceEnCatalogo, true),
    logoEnWeb: flag(input.logoEnWeb, false),
    destacadoEnListados: flag(input.destacadoEnListados, false),
    urlQR: optionalText(input.urlQR, MAX.urlQR),
    orden: Number(input.orden) || 0,
  };
}

/** One bullet per line, so blank lines never become empty bullets. */
function benefitsOf(value: unknown): string | null {
  const lines = (typeof value === 'string' ? value : '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
    .slice(0, MAX.contenido);

  return lines.length > 0 ? lines : null;
}
