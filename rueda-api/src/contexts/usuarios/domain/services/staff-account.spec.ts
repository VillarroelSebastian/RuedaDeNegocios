import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../../../shared/domain/errors/domain.error.js';
import { sanitizeProfilePatch, sanitizeTechnicianAccount } from './staff-account.js';

const ACCOUNT = {
  nombres: '  Ana  ',
  apellidoPaterno: ' Perez ',
  correo: ' Ana@Test.COM ',
  telefono: '+591 700-11223',
};

describe('sanitizeTechnicianAccount', () => {
  it('trims the names and normalises the contact details', () => {
    const account = sanitizeTechnicianAccount(ACCOUNT);

    expect(account.nombres).toBe('Ana');
    expect(account.apellidoPaterno).toBe('Perez');
    expect(account.correo).toBe('ana@test.com');
    expect(account.telefono).toBe('+591 700-11223');
    expect(account.telefonoDigits).toBe('59170011223');
  });

  it('stores no second surname when it was left out', () => {
    expect(sanitizeTechnicianAccount(ACCOUNT).apellidoMaterno).toBeNull();
    expect(
      sanitizeTechnicianAccount({ ...ACCOUNT, apellidoMaterno: ' Lopez ' }).apellidoMaterno,
    ).toBe('Lopez');
  });

  it('refuses an account without a name or a surname', () => {
    expect(() => sanitizeTechnicianAccount({ ...ACCOUNT, nombres: '  ' })).toThrow(
      'Nombres y apellido paterno son obligatorios',
    );
    expect(() => sanitizeTechnicianAccount({ ...ACCOUNT, apellidoPaterno: '' })).toThrow(
      ValidationError,
    );
  });

  it('refuses an address that is not one', () => {
    expect(() => sanitizeTechnicianAccount({ ...ACCOUNT, correo: 'ana@test' })).toThrow(
      'El correo no es valido',
    );
  });

  it('refuses a phone with fewer than seven digits', () => {
    expect(() => sanitizeTechnicianAccount({ ...ACCOUNT, telefono: '700-11' })).toThrow(
      'El telefono no es valido',
    );
  });

  /** Two technician roles exist; anything else is not a technician. */
  it('reads the role, defaulting to the plain technician', () => {
    expect(sanitizeTechnicianAccount(ACCOUNT).rolEvento).toBe('TECNICO');
    expect(
      sanitizeTechnicianAccount({ ...ACCOUNT, rolEvento: 'TECNICO_EVENTOS' }).rolEvento,
    ).toBe('TECNICO_EVENTOS');
    expect(sanitizeTechnicianAccount({ ...ACCOUNT, rolEvento: 'ADMINISTRADOR' }).rolEvento).toBe(
      'TECNICO',
    );
  });

  it('caps the text at the width of its column', () => {
    const account = sanitizeTechnicianAccount({ ...ACCOUNT, nombres: 'N'.repeat(200) });

    expect(account.nombres).toHaveLength(105);
  });
});

describe('sanitizeProfilePatch', () => {
  const current = {
    nombres: 'Ana',
    apellidoPaterno: 'Perez',
    apellidoMaterno: 'Lopez',
    correo: 'ana@test.com',
    telefono: '70011223',
  };

  it('keeps what the request did not name', () => {
    const patch = sanitizeProfilePatch({}, current);

    expect(patch.nombres).toBe('Ana');
    expect(patch.correo).toBe('ana@test.com');
    expect(patch.apellidoMaterno).toBe('Lopez');
    expect(patch.correoCambio).toBe(false);
  });

  it('takes what the request did name', () => {
    const patch = sanitizeProfilePatch({ nombres: '  Ana María ' }, current);

    expect(patch.nombres).toBe('Ana María');
  });

  it('clears the second surname when it is sent empty', () => {
    expect(sanitizeProfilePatch({ apellidoMaterno: '' }, current).apellidoMaterno).toBeNull();
  });

  it('flags a change of address, which is what forces a new password', () => {
    const patch = sanitizeProfilePatch({ correo: 'Otra@Test.com' }, current);

    expect(patch.correo).toBe('otra@test.com');
    expect(patch.correoCambio).toBe(true);
  });

  it('does not flag the same address typed differently', () => {
    expect(sanitizeProfilePatch({ correo: ' ANA@test.com ' }, current).correoCambio).toBe(false);
  });

  it('refuses emptying a name', () => {
    expect(() => sanitizeProfilePatch({ nombres: '   ' }, current)).toThrow(
      'Nombres y apellido paterno son obligatorios',
    );
  });

  it('refuses an address that is not one', () => {
    expect(() => sanitizeProfilePatch({ correo: 'ana@test' }, current)).toThrow(
      'El correo no es valido',
    );
  });
});
