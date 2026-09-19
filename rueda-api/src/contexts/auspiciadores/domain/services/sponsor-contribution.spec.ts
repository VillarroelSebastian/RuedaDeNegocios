import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../../../shared/domain/errors/domain.error.js';
import { sanitizeSponsorContribution } from './sponsor-contribution.js';

const MONEY = {
  nombreEmpresa: '  Banco  Beni ',
  descripcion: ' Banca regional ',
  tipoAporte: 'DINERO',
  montoAporte: 5000,
  cantidadIngresos: 2,
};

describe('sanitizeSponsorContribution', () => {
  it('collapses the whitespace of the text it stores', () => {
    const sponsor = sanitizeSponsorContribution(MONEY);

    expect(sponsor.nombreEmpresa).toBe('Banco Beni');
    expect(sponsor.descripcion).toBe('Banca regional');
  });

  it('accepts the kind of contribution however it was typed', () => {
    expect(sanitizeSponsorContribution({ ...MONEY, tipoAporte: 'dinero' }).tipoAporte).toBe(
      'DINERO',
    );
  });

  it('refuses a kind of contribution that is not one', () => {
    expect(() => sanitizeSponsorContribution({ ...MONEY, tipoAporte: 'CANJE' })).toThrow(
      'El aporte debe ser DINERO, INSUMOS o AMBOS.',
    );
  });

  describe('what each kind of contribution needs', () => {
    /** An amount only means something when money changed hands. */
    it('needs an amount above zero when money is given', () => {
      expect(() => sanitizeSponsorContribution({ ...MONEY, montoAporte: 0 })).toThrow(
        'Indica el monto aportado (mayor a 0).',
      );
      expect(() => sanitizeSponsorContribution({ ...MONEY, montoAporte: undefined })).toThrow(
        ValidationError,
      );
    });

    it('keeps no amount for a contribution in kind', () => {
      const sponsor = sanitizeSponsorContribution({
        ...MONEY,
        tipoAporte: 'INSUMOS',
        montoAporte: 5000,
        detalleAporte: '200 sillas',
      });

      expect(sponsor.montoAporte).toBeNull();
      expect(sponsor.detalleAporte).toBe('200 sillas');
    });

    /** What was given only means something when it was not money. */
    it('needs the detail of what was given in kind', () => {
      expect(() =>
        sanitizeSponsorContribution({ ...MONEY, tipoAporte: 'INSUMOS', detalleAporte: '  ' }),
      ).toThrow('Detalle de los insumos');
    });

    it('keeps no detail for a contribution in money', () => {
      expect(
        sanitizeSponsorContribution({ ...MONEY, detalleAporte: '200 sillas' }).detalleAporte,
      ).toBeNull();
    });

    it('needs both when the sponsor gave both', () => {
      const sponsor = sanitizeSponsorContribution({
        ...MONEY,
        tipoAporte: 'AMBOS',
        detalleAporte: '200 sillas',
      });

      expect(sponsor.montoAporte).toBe(5000);
      expect(sponsor.detalleAporte).toBe('200 sillas');
    });
  });

  it('refuses a sponsor with nobody coming in', () => {
    expect(() => sanitizeSponsorContribution({ ...MONEY, cantidadIngresos: 0 })).toThrow(
      'La cantidad de ingresos debe ser al menos 1.',
    );
  });

  it('refuses a sponsor without a name or without a description', () => {
    expect(() => sanitizeSponsorContribution({ ...MONEY, nombreEmpresa: ' ' })).toThrow(
      'Nombre de la empresa',
    );
    expect(() => sanitizeSponsorContribution({ ...MONEY, descripcion: '' })).toThrow(
      'Descripción de la empresa',
    );
  });

  it('caps the text at the width of its column', () => {
    const sponsor = sanitizeSponsorContribution({
      ...MONEY,
      nombreEmpresa: 'N'.repeat(200),
    });

    expect(sponsor.nombreEmpresa).toHaveLength(155);
  });

  it('keeps the package the sponsor was given, when there is one', () => {
    expect(sanitizeSponsorContribution({ ...MONEY, paqueteId: 3 }).paqueteId).toBe(3);
    expect(sanitizeSponsorContribution(MONEY).paqueteId).toBeNull();
  });
});
