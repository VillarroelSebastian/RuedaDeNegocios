import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../../../shared/domain/errors/domain.error.js';
import { sanitizePackageDefinition } from './package-definition.js';

const DEFINITION = {
  nombre: '  Paquete  Beni  ',
  costo: 1500,
  credencialesIncluidas: 2,
};

describe('sanitizePackageDefinition', () => {
  it('collapses the whitespace of the name', () => {
    expect(sanitizePackageDefinition(DEFINITION).nombre).toBe('Paquete Beni');
  });

  it('refuses a package with no name', () => {
    expect(() => sanitizePackageDefinition({ ...DEFINITION, nombre: '  ' })).toThrow(
      'El nombre del paquete es obligatorio.',
    );
  });

  it('accepts a free package', () => {
    expect(sanitizePackageDefinition({ ...DEFINITION, costo: 0 }).costo).toBe(0);
  });

  it('refuses a cost that is not a number at or above zero', () => {
    expect(() => sanitizePackageDefinition({ ...DEFINITION, costo: -1 })).toThrow(
      'El costo debe ser un número mayor o igual a 0.',
    );
    expect(() => sanitizePackageDefinition({ ...DEFINITION, costo: 'gratis' })).toThrow(
      ValidationError,
    );
  });

  it('refuses a package that includes no credentials', () => {
    expect(() =>
      sanitizePackageDefinition({ ...DEFINITION, credencialesIncluidas: 0 }),
    ).toThrow('Las credenciales incluidas deben ser al menos 1.');
  });

  /**
   * A cap below what the package already includes would stop a company loading
   * even the credentials it paid for.
   */
  it('refuses a cap below the credentials it includes', () => {
    expect(() =>
      sanitizePackageDefinition({
        ...DEFINITION,
        credencialesIncluidas: 4,
        maxParticipantes: 2,
      }),
    ).toThrow('El máximo de participantes (2) no puede ser menor que las 4 credenciales incluidas.');
  });

  it('defaults the cap to the credentials it includes', () => {
    expect(sanitizePackageDefinition(DEFINITION).maxParticipantes).toBe(2);
  });

  it('accepts the table level however it was typed', () => {
    expect(sanitizePackageDefinition({ ...DEFINITION, nivelMesa: 'vip' }).nivelMesa).toBe('VIP');
  });

  it('refuses a table level that is not one', () => {
    expect(() => sanitizePackageDefinition({ ...DEFINITION, nivelMesa: 'ORO' })).toThrow(
      'El nivel de mesa debe ser NORMAL, PREFERENCIAL o VIP.',
    );
  });

  it('refuses a modality that is not one', () => {
    expect(() =>
      sanitizePackageDefinition({ ...DEFINITION, tipoParticipacion: 'REMOTO' }),
    ).toThrow('La modalidad debe ser PRESENCIAL, VIRTUAL o HIBRIDO.');
  });

  it('defaults to a face to face package that appears in the catalogue', () => {
    const definition = sanitizePackageDefinition(DEFINITION);

    expect(definition.tipoParticipacion).toBe('PRESENCIAL');
    expect(definition.nivelMesa).toBe('NORMAL');
    expect(definition.apareceEnCatalogo).toBe(true);
    expect(definition.logoEnWeb).toBe(false);
    expect(definition.destacadoEnListados).toBe(false);
  });

  /** The benefits are one bullet per line, so blank lines are dropped. */
  it('keeps the benefits one per line', () => {
    const definition = sanitizePackageDefinition({
      ...DEFINITION,
      contenido: '  Podcast \n\n  Pantalla LED  \n',
    });

    expect(definition.contenido).toBe('Podcast\nPantalla LED');
  });

  it('turns blank optional text into nothing stored', () => {
    const definition = sanitizePackageDefinition({
      ...DEFINITION,
      objetivo: '   ',
      descripcion: '',
      contenido: '\n\n',
    });

    expect(definition.objetivo).toBeNull();
    expect(definition.descripcion).toBeNull();
    expect(definition.contenido).toBeNull();
  });

  it('caps the text at the width of its column', () => {
    const definition = sanitizePackageDefinition({
      ...DEFINITION,
      nombre: 'N'.repeat(200),
      objetivo: 'O'.repeat(300),
    });

    expect(definition.nombre).toHaveLength(105);
    expect(definition.objetivo).toHaveLength(205);
  });

  it('places the package where the administrator ordered it', () => {
    expect(sanitizePackageDefinition({ ...DEFINITION, orden: 3 }).orden).toBe(3);
    expect(sanitizePackageDefinition(DEFINITION).orden).toBe(0);
  });
});
