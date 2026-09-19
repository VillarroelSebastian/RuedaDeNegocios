import { ValidationError } from '../../../../shared/domain/errors/domain.error.js';

/** Column widths of `resultadoreunion` and of the meeting link. */
const MAX = { rango: 45, observaciones: 505, enlace: 500 } as const;

const MIN_SCORE = 1;
const MAX_SCORE = 5;

const INCOMPLETE = 'Completa la calificación, rango y observaciones de ambas empresas';

export interface EvaluationPairInput {
  calificacionA: unknown;
  rangoA: unknown;
  observacionesA: unknown;
  calificacionB: unknown;
  rangoB: unknown;
  observacionesB: unknown;
}

export interface Evaluation {
  calificacionReunion: number;
  rangoAcuerdoComercial: string;
  observacionesPuntosTratados: string;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * What one company records about a meeting. The legacy endpoint only checked
 * the score was truthy, so a meeting could be scored 99 out of 5.
 */
export function sanitizeEvaluation(
  score: unknown,
  range: unknown,
  remarks: unknown,
): Evaluation {
  return evaluationOf(score, range, remarks);
}

function evaluationOf(score: unknown, range: unknown, remarks: unknown): Evaluation {
  const calificacionReunion = Number(score);
  const rangoAcuerdoComercial = text(range).slice(0, MAX.rango);
  const observacionesPuntosTratados = text(remarks).slice(0, MAX.observaciones);

  if (
    !Number.isInteger(calificacionReunion) ||
    calificacionReunion < MIN_SCORE ||
    calificacionReunion > MAX_SCORE ||
    !rangoAcuerdoComercial ||
    !observacionesPuntosTratados
  ) {
    throw new ValidationError(INCOMPLETE);
  }

  return { calificacionReunion, rangoAcuerdoComercial, observacionesPuntosTratados };
}

/**
 * What the event team records for both companies when it closes a meeting on
 * their behalf. Both halves are required: half a record is a meeting nobody can
 * report on afterwards.
 */
export function sanitizeEvaluationPair(input: EvaluationPairInput): [Evaluation, Evaluation] {
  return [
    evaluationOf(input.calificacionA, input.rangoA, input.observacionesA),
    evaluationOf(input.calificacionB, input.rangoB, input.observacionesB),
  ];
}

/**
 * The link a virtual meeting is held on. It has to be a secure URL: companies
 * are told to open it, so an insecure or malformed one is worse than none.
 */
export function normalizeMeetingLink(
  value: unknown,
  options: { allowEmpty?: boolean } = {},
): string | null {
  const link = text(value);
  if (!link) {
    if (options.allowEmpty) return null;
    throw new ValidationError('Debes ingresar el enlace de la reunión virtual.');
  }
  if (link.length > MAX.enlace) {
    throw new ValidationError('El enlace de la reunión es demasiado largo.');
  }

  let url: URL;
  try {
    url = new URL(link);
  } catch {
    throw new ValidationError('El enlace debe ser una URL segura que comience con https://');
  }
  if (url.protocol !== 'https:') {
    throw new ValidationError('El enlace debe ser una URL segura que comience con https://');
  }

  return url.toString();
}
