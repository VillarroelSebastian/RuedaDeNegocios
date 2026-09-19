import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../../../shared/domain/errors/domain.error.js';
import { sanitizeCompanyApplication } from './company-application.js';

const VALID = {
  nombre: '  Agro   Beni  SRL ',
  rubro: 'Agropecuaria',
  correoCorporativo: '  Contacto@AgroBeni.COM ',
  telefonoWhatsapp: ' +591 700-11223 ',
};

describe('sanitizeCompanyApplication', () => {
  it('collapses the whitespace of the name', () => {
    expect(sanitizeCompanyApplication(VALID).nombre).toBe('Agro Beni SRL');
  });

  it('lowercases and trims the corporate email', () => {
    expect(sanitizeCompanyApplication(VALID).correoCorporativo).toBe('contacto@agrobeni.com');
  });

  it('keeps the phone as typed and exposes its digits apart', () => {
    const application = sanitizeCompanyApplication(VALID);

    expect(application.telefonoWhatsapp).toBe('+591 700-11223');
    expect(application.telefonoDigits).toBe('59170011223');
  });

  it('refuses a name shorter than 3 or longer than 55 characters', () => {
    expect(() => sanitizeCompanyApplication({ ...VALID, nombre: 'AB' })).toThrow(
      'El nombre de la empresa debe tener entre 3 y 55 caracteres.',
    );
    expect(() => sanitizeCompanyApplication({ ...VALID, nombre: 'A'.repeat(56) })).toThrow(
      ValidationError,
    );
  });

  it('refuses a name carrying characters a company name never has', () => {
    expect(() => sanitizeCompanyApplication({ ...VALID, nombre: 'Agro <script>' })).toThrow(
      'El nombre de la empresa contiene caracteres no permitidos.',
    );
  });

  it('refuses a name that reads as digits', () => {
    expect(() => sanitizeCompanyApplication({ ...VALID, nombre: 'A 123' })).toThrow(
      'El nombre de la empresa debe incluir al menos 2 letras.',
    );
  });

  it('accepts accented names', () => {
    expect(sanitizeCompanyApplication({ ...VALID, nombre: 'Construcción Ñandú' }).nombre).toBe(
      'Construcción Ñandú',
    );
  });

  it('refuses an invalid corporate email', () => {
    expect(() => sanitizeCompanyApplication({ ...VALID, correoCorporativo: 'agro@beni' })).toThrow(
      'El correo corporativo no es válido.',
    );
  });

  it('refuses a phone with fewer than 7 digits', () => {
    expect(() => sanitizeCompanyApplication({ ...VALID, telefonoWhatsapp: '700-11' })).toThrow(
      'El telefono/WhatsApp de la empresa no es valido.',
    );
  });

  it('caps the free text fields at their column length', () => {
    const application = sanitizeCompanyApplication({
      ...VALID,
      descripcion: 'd'.repeat(1200),
      oferta: 'o'.repeat(700),
      demanda: 'q'.repeat(700),
      interesesBusqueda: 'i'.repeat(800),
    });

    expect(application.descripcion).toHaveLength(1000);
    expect(application.oferta).toHaveLength(500);
    expect(application.demanda).toHaveLength(500);
    expect(application.interesesBusqueda).toHaveLength(600);
  });

  it('turns blank optional text into nothing stored', () => {
    const application = sanitizeCompanyApplication({ ...VALID, descripcion: '   ', sitioWeb: '' });

    expect(application.descripcion).toBeNull();
    expect(application.sitioWeb).toBeNull();
  });

  it('falls back to the host city when none is given', () => {
    const application = sanitizeCompanyApplication(VALID);

    expect(application.paisNombre).toBe('Bolivia');
    expect(application.ciudadNombre).toBe('Trinidad');
  });

  it('keeps the place the company typed', () => {
    const application = sanitizeCompanyApplication({
      ...VALID,
      paisNombre: '  Brasil ',
      ciudadNombre: ' Corumbá ',
    });

    expect(application.paisNombre).toBe('Brasil');
    expect(application.ciudadNombre).toBe('Corumbá');
  });
});
