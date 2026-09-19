import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../../../shared/domain/errors/domain.error.js';
import { sanitizeRepresentatives } from './sponsor-representatives.js';

const ANA = { nombreCompleto: '  Ana  Perez ', cargo: ' Gerente ', correo: ' Ana@Test.COM ' };
const LUIS = { nombreCompleto: 'Luis Gomez', cargo: null, correo: 'luis@test.com' };

describe('sanitizeRepresentatives', () => {
  it('trims the names and normalises the addresses', () => {
    const [ana] = sanitizeRepresentatives([ANA], 1);

    expect(ana.nombreCompleto).toBe('Ana Perez');
    expect(ana.cargo).toBe('Gerente');
    expect(ana.correo).toBe('ana@test.com');
  });

  it('stores no role when none was given', () => {
    expect(sanitizeRepresentatives([LUIS], 1)[0].cargo).toBeNull();
  });

  it('refuses a sponsor with nobody registered', () => {
    expect(() => sanitizeRepresentatives([], 1)).toThrow(
      'Registra al menos una persona del auspiciador.',
    );
  });

  it('drops an entry with no name at all', () => {
    expect(() => sanitizeRepresentatives([{ nombreCompleto: '  ' }], 1)).toThrow(
      'Registra al menos una persona del auspiciador.',
    );
  });

  /**
   * Each person coming in gets one credential, so the list and the declared
   * number of entries are the same thing counted twice.
   */
  it('refuses a list that does not match the entries declared', () => {
    expect(() => sanitizeRepresentatives([ANA], 2)).toThrow(
      'Declaraste 2 ingreso(s) pero cargaste 1 persona(s). Deben coincidir.',
    );
    expect(() => sanitizeRepresentatives([ANA, LUIS], 1)).toThrow(ValidationError);
  });

  it('needs an address to send each credential to', () => {
    expect(() =>
      sanitizeRepresentatives([{ ...ANA, correo: '' }], 1),
    ).toThrow('El correo de Ana Perez es obligatorio para enviar su credencial.');
  });

  it('refuses an address that is not one', () => {
    expect(() => sanitizeRepresentatives([{ ...ANA, correo: 'ana@test' }], 1)).toThrow(
      'El correo "ana@test" no es válido.',
    );
  });

  it('refuses the same address twice, however it was typed', () => {
    expect(() =>
      sanitizeRepresentatives([ANA, { ...LUIS, correo: 'ANA@test.com' }], 2),
    ).toThrow('El correo "ana@test.com" está repetido entre los representantes del auspiciador.');
  });

  it('refuses a name longer than the column holds', () => {
    expect(() =>
      sanitizeRepresentatives([{ ...ANA, nombreCompleto: 'N'.repeat(200) }], 1),
    ).toThrow('El nombre de una persona supera los 155 caracteres.');
  });
});
