import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../../../shared/domain/errors/domain.error.js';
import {
  normalizeMeetingLink,
  sanitizeEvaluation,
  sanitizeEvaluationPair,
} from './meeting-evaluation.js';

const PAIR = {
  calificacionA: 5,
  rangoA: ' 10.000 - 50.000 USD ',
  observacionesA: '  Acuerdo de suministro  ',
  calificacionB: 4,
  rangoB: 'Sin acuerdo',
  observacionesB: 'Seguiremos conversando',
};

describe('sanitizeEvaluationPair', () => {
  it('trims what each company wrote', () => {
    const [first, second] = sanitizeEvaluationPair(PAIR);

    expect(first.rangoAcuerdoComercial).toBe('10.000 - 50.000 USD');
    expect(first.observacionesPuntosTratados).toBe('Acuerdo de suministro');
    expect(second.calificacionReunion).toBe(4);
  });

  it.each([0, 6, 2.5, Number.NaN])('refuses %s as a score', (score) => {
    expect(() => sanitizeEvaluationPair({ ...PAIR, calificacionA: score })).toThrow(
      'Completa la calificación, rango y observaciones de ambas empresas',
    );
  });

  it('refuses an empty range or empty remarks', () => {
    expect(() => sanitizeEvaluationPair({ ...PAIR, rangoB: '   ' })).toThrow(ValidationError);
    expect(() => sanitizeEvaluationPair({ ...PAIR, observacionesB: '' })).toThrow(ValidationError);
  });

  it('caps the remarks at the width of the column', () => {
    const [first] = sanitizeEvaluationPair({ ...PAIR, observacionesA: 'o'.repeat(900) });

    expect(first.observacionesPuntosTratados).toHaveLength(505);
  });
});

describe('sanitizeEvaluation', () => {
  it('reads what one company recorded', () => {
    const evaluation = sanitizeEvaluation(4, ' Sin acuerdo ', '  Volvemos a hablar  ');

    expect(evaluation).toEqual({
      calificacionReunion: 4,
      rangoAcuerdoComercial: 'Sin acuerdo',
      observacionesPuntosTratados: 'Volvemos a hablar',
    });
  });

  /** The legacy endpoint only checked the score was truthy. */
  it('refuses a score outside one to five', () => {
    expect(() => sanitizeEvaluation(99, 'Sin acuerdo', 'Texto')).toThrow(ValidationError);
    expect(() => sanitizeEvaluation(0, 'Sin acuerdo', 'Texto')).toThrow(ValidationError);
  });
});

describe('normalizeMeetingLink', () => {
  it('accepts a secure link', () => {
    expect(normalizeMeetingLink('https://meet.test/abc')).toBe('https://meet.test/abc');
  });

  it('refuses a link that is not secure', () => {
    expect(() => normalizeMeetingLink('http://meet.test/abc')).toThrow(
      'El enlace debe ser una URL segura que comience con https://',
    );
  });

  it('refuses something that is not a link at all', () => {
    expect(() => normalizeMeetingLink('pasame el zoom')).toThrow(ValidationError);
  });

  it('refuses a link longer than the column holds', () => {
    expect(() => normalizeMeetingLink(`https://meet.test/${'a'.repeat(600)}`)).toThrow(
      'El enlace de la reunión es demasiado largo.',
    );
  });

  it('treats nothing as no link when that is allowed', () => {
    expect(normalizeMeetingLink('', { allowEmpty: true })).toBeNull();
    expect(normalizeMeetingLink(undefined, { allowEmpty: true })).toBeNull();
  });

  it('demands a link when one is required', () => {
    expect(() => normalizeMeetingLink('  ')).toThrow(
      'Debes ingresar el enlace de la reunión virtual.',
    );
  });
});
