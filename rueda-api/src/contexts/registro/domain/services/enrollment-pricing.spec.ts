import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../../../shared/domain/errors/domain.error.js';
import { priceEnrollment } from './enrollment-pricing.js';

const PACKAGE = {
  id: 3,
  costo: 1500,
  credencialesIncluidas: 2,
  tipoParticipacion: 'PRESENCIAL',
};

describe('priceEnrollment', () => {
  it('takes the amount, the slots and the modality from the package', () => {
    const priced = priceEnrollment(PACKAGE, 2);

    expect(priced.montoPagado).toBe(1500);
    expect(priced.numeroParticipantes).toBe(2);
    expect(priced.tipoParticipacion).toBe('PRESENCIAL');
  });

  it('prices a roster that does not fill the package at the full package price', () => {
    expect(priceEnrollment(PACKAGE, 1).montoPagado).toBe(1500);
    expect(priceEnrollment(PACKAGE, 1).numeroParticipantes).toBe(2);
  });

  it('refuses a roster larger than the credentials the package includes', () => {
    expect(() => priceEnrollment(PACKAGE, 3)).toThrow(
      'El paquete seleccionado incluye 2 credenciales y registraste 3 participantes.',
    );
    expect(() => priceEnrollment(PACKAGE, 3)).toThrow(ValidationError);
  });
});
