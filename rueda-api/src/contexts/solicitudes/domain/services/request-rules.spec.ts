import { describe, expect, it } from 'vitest';
import {
  ConflictError,
  ForbiddenError,
  ValidationError,
} from '../../../../shared/domain/errors/domain.error.js';
import {
  assertCanAccept,
  assertCanCancel,
  assertCanEdit,
  assertCanReject,
  assertDifferentCompanies,
  normalizeMeetingType,
  parseProposedWindow,
} from './request-rules.js';

const SENDER = 100;
const RECEIVER = 200;
const PENDING = { estadoSolicitud: 'PENDIENTE', solicitanteId: SENDER, receptoraId: RECEIVER };

describe('normalizeMeetingType', () => {
  it('accepts the two kinds of meeting, however they were typed', () => {
    expect(normalizeMeetingType('presencial')).toBe('PRESENCIAL');
    expect(normalizeMeetingType('VIRTUAL')).toBe('VIRTUAL');
  });

  it('refuses anything else', () => {
    expect(() => normalizeMeetingType('HIBRIDA')).toThrow(
      'El tipo de reunión debe ser PRESENCIAL o VIRTUAL',
    );
    expect(() => normalizeMeetingType('')).toThrow(ValidationError);
  });
});

describe('assertDifferentCompanies', () => {
  it('lets two companies meet', () => {
    expect(() => assertDifferentCompanies(SENDER, RECEIVER)).not.toThrow();
  });

  it('refuses a company meeting itself', () => {
    expect(() => assertDifferentCompanies(SENDER, SENDER)).toThrow(
      'No puedes solicitar una reunión contigo mismo',
    );
  });
});

describe('parseProposedWindow', () => {
  const now = new Date('2026-11-10T12:00:00.000Z');

  it('reads the window a request proposes', () => {
    const window = parseProposedWindow('2026-11-10T14:00:00.000Z', '2026-11-10T14:20:00.000Z', now);

    expect(window.start.toISOString()).toBe('2026-11-10T14:00:00.000Z');
    expect(window.end.toISOString()).toBe('2026-11-10T14:20:00.000Z');
  });

  it('refuses instants that are not instants', () => {
    expect(() => parseProposedWindow('mañana', '2026-11-10T14:20:00.000Z', now)).toThrow(
      'El horario de la reunión debe ser futuro y pertenecer al evento activo.',
    );
  });

  it('refuses a window that already started', () => {
    expect(() =>
      parseProposedWindow('2026-11-10T11:00:00.000Z', '2026-11-10T11:20:00.000Z', now),
    ).toThrow(ValidationError);
  });

  it('refuses a window that ends before it starts', () => {
    expect(() =>
      parseProposedWindow('2026-11-10T14:20:00.000Z', '2026-11-10T14:00:00.000Z', now),
    ).toThrow(ValidationError);
  });
});

describe('who may act on a request', () => {
  it('lets only the company that sent it edit it', () => {
    expect(() => assertCanEdit(PENDING, SENDER)).not.toThrow();
    expect(() => assertCanEdit(PENDING, RECEIVER)).toThrow(
      'Solo la empresa que envió la solicitud puede editarla',
    );
  });

  it('lets only the company that received it accept it', () => {
    expect(() => assertCanAccept(PENDING, RECEIVER)).not.toThrow();
    expect(() => assertCanAccept(PENDING, SENDER)).toThrow(
      'No tienes permiso para aceptar esta solicitud',
    );
  });

  it('lets only the company that received it reject it', () => {
    expect(() => assertCanReject(PENDING, RECEIVER)).not.toThrow();
    expect(() => assertCanReject(PENDING, SENDER)).toThrow(
      'Solo la empresa receptora puede rechazar esta solicitud',
    );
  });

  it('lets only the company that sent it cancel it', () => {
    expect(() => assertCanCancel(PENDING, SENDER)).not.toThrow();
    expect(() => assertCanCancel(PENDING, RECEIVER)).toThrow(
      'Solo la empresa solicitante puede cancelar esta solicitud',
    );
  });

  it('raises a forbidden error, not a validation one', () => {
    expect(() => assertCanEdit(PENDING, RECEIVER)).toThrow(ForbiddenError);
  });

  /** Everything but a pending request has already been decided. */
  it.each(['ACEPTADA', 'RECHAZADA', 'CANCELADA'])('refuses to act on a %s request', (estado) => {
    const settled = { ...PENDING, estadoSolicitud: estado };

    expect(() => assertCanEdit(settled, SENDER)).toThrow(ConflictError);
    expect(() => assertCanAccept(settled, RECEIVER)).toThrow(ConflictError);
    expect(() => assertCanReject(settled, RECEIVER)).toThrow(ConflictError);
    expect(() => assertCanCancel(settled, SENDER)).toThrow(ConflictError);
  });

  it('says the request was already dealt with, not that it is missing', () => {
    expect(() => assertCanAccept({ ...PENDING, estadoSolicitud: 'ACEPTADA' }, RECEIVER)).toThrow(
      'Solicitud no encontrada o ya procesada',
    );
  });
});
