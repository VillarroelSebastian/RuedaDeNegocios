import { ValidationError } from '../../../../shared/domain/errors/domain.error.js';

/** What the sponsor gave: money, goods, or both. */
export const CONTRIBUTION_TYPES = ['DINERO', 'INSUMOS', 'AMBOS'] as const;

export type ContributionType = (typeof CONTRIBUTION_TYPES)[number];

/** Column widths of `auspiciador`. */
const MAX = { nombreEmpresa: 155, descripcion: 1000, detalleAporte: 505 } as const;

export interface SponsorContributionInput {
  nombreEmpresa?: unknown;
  descripcion?: unknown;
  tipoAporte?: unknown;
  montoAporte?: unknown;
  detalleAporte?: unknown;
  paqueteId?: unknown;
  cantidadIngresos?: unknown;
}

export interface SponsorContribution {
  nombreEmpresa: string;
  descripcion: string;
  tipoAporte: ContributionType;
  /** Only when money changed hands. */
  montoAporte: number | null;
  /** Only when something other than money was given. */
  detalleAporte: string | null;
  paqueteId: number | null;
  /** How many people come in, which is how many credentials are issued. */
  cantidadIngresos: number;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function required(value: unknown, maxLength: number, field: string): string {
  const trimmed = text(value).slice(0, maxLength);
  if (!trimmed) throw new ValidationError(`El campo "${field}" es obligatorio.`);
  return trimmed;
}

export function sanitizeSponsorContribution(
  input: SponsorContributionInput,
): SponsorContribution {
  const tipoAporte = text(input.tipoAporte).toUpperCase() as ContributionType;
  if (!CONTRIBUTION_TYPES.includes(tipoAporte)) {
    throw new ValidationError('El aporte debe ser DINERO, INSUMOS o AMBOS.');
  }

  // An amount only means something when money changed hands, and the detail of
  // what was given only means something when it was not money.
  let montoAporte: number | null = null;
  if (tipoAporte !== 'INSUMOS') {
    const amount = Number(input.montoAporte);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new ValidationError('Indica el monto aportado (mayor a 0).');
    }
    montoAporte = amount;
  }

  const detalleAporte =
    tipoAporte === 'DINERO'
      ? null
      : required(input.detalleAporte, MAX.detalleAporte, 'Detalle de los insumos');

  const cantidadIngresos = Number(input.cantidadIngresos);
  if (!Number.isInteger(cantidadIngresos) || cantidadIngresos < 1) {
    throw new ValidationError('La cantidad de ingresos debe ser al menos 1.');
  }

  return {
    nombreEmpresa: required(input.nombreEmpresa, MAX.nombreEmpresa, 'Nombre de la empresa'),
    descripcion: required(input.descripcion, MAX.descripcion, 'Descripción de la empresa'),
    tipoAporte,
    montoAporte,
    detalleAporte,
    paqueteId: input.paqueteId ? Number(input.paqueteId) : null,
    cantidadIngresos,
  };
}
