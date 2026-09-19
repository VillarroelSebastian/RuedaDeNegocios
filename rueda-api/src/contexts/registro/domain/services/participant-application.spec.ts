import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../../../shared/domain/errors/domain.error.js';
import { sanitizeParticipantApplications } from './participant-application.js';

const LEAD = {
  nombres: ' Ana  ',
  apellidoPaterno: ' Perez ',
  correo: ' Ana@Test.COM ',
  telefono: '+591 700-11223',
  cargo: ' Gerente ',
  esResponsable: true,
};

const MATE = {
  nombres: 'Luis',
  apellidoPaterno: 'Gomez',
  correo: 'luis@test.com',
  telefono: '70099887',
};

describe('sanitizeParticipantApplications', () => {
  it('trims the names and normalises the contact details', () => {
    const [lead] = sanitizeParticipantApplications([LEAD]);

    expect(lead.nombres).toBe('Ana');
    expect(lead.apellidoPaterno).toBe('Perez');
    expect(lead.correo).toBe('ana@test.com');
    expect(lead.telefonoDigits).toBe('59170011223');
    expect(lead.cargo).toBe('Gerente');
    expect(lead.esResponsable).toBe(true);
  });

  it('refuses an empty roster', () => {
    expect(() => sanitizeParticipantApplications([])).toThrow(
      'Debes registrar al menos un participante.',
    );
  });

  it('refuses a roster with nobody in charge', () => {
    expect(() => sanitizeParticipantApplications([MATE])).toThrow(
      'Debes indicar quién es el encargado de la empresa.',
    );
  });

  it('refuses a roster with two people in charge', () => {
    expect(() =>
      sanitizeParticipantApplications([LEAD, { ...MATE, esResponsable: true }]),
    ).toThrow('Solo una persona puede ser el encargado de la empresa.');
  });

  it('names the position of an invalid email', () => {
    expect(() =>
      sanitizeParticipantApplications([LEAD, { ...MATE, correo: 'luis@test' }]),
    ).toThrow('El correo del participante 2 no es valido.');
  });

  it('refuses the same email twice', () => {
    expect(() =>
      sanitizeParticipantApplications([LEAD, { ...MATE, correo: 'ANA@test.com' }]),
    ).toThrow('El correo ana@test.com esta repetido entre los participantes.');
  });

  it('refuses a phone with fewer than 7 digits', () => {
    expect(() => sanitizeParticipantApplications([{ ...LEAD, telefono: '700' }])).toThrow(
      'El telefono del participante 1 no es valido.',
    );
  });

  it('refuses the same phone twice, however it was typed', () => {
    expect(() =>
      sanitizeParticipantApplications([LEAD, { ...MATE, telefono: '591-700-11223' }]),
    ).toThrow('El telefono del participante 2 esta repetido.');
  });

  it('raises a validation error, not a plain one', () => {
    expect(() => sanitizeParticipantApplications([])).toThrow(ValidationError);
  });

  it('falls back to a readable surname when none was given', () => {
    const [lead] = sanitizeParticipantApplications([
      { ...LEAD, nombres: '  ', apellidoPaterno: '  ' },
    ]);

    expect(lead.nombres).toBe('Sin nombre');
    expect(lead.apellidoPaterno).toBe('Participante');
  });

  it('stores no second surname when it was left out', () => {
    expect(sanitizeParticipantApplications([LEAD])[0].apellidoMaterno).toBeNull();
    expect(
      sanitizeParticipantApplications([{ ...LEAD, apellidoMaterno: ' Rojas ' }])[0].apellidoMaterno,
    ).toBe('Rojas');
  });
});
