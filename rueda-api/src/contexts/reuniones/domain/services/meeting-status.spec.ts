import { describe, expect, it } from 'vitest';
import { ConflictError, ValidationError } from '../../../../shared/domain/errors/domain.error.js';
import { assertTransition, isLive, normalizeMeetingStatus } from './meeting-status.js';

describe('normalizeMeetingStatus', () => {
  it('accepts a state however it was typed', () => {
    expect(normalizeMeetingStatus('en_curso')).toBe('EN_CURSO');
  });

  it('refuses a state a meeting never has', () => {
    expect(() => normalizeMeetingStatus('PAUSADA')).toThrow(ValidationError);
    expect(() => normalizeMeetingStatus('')).toThrow(ValidationError);
  });
});

describe('assertTransition', () => {
  it('lets a booked meeting start or be called off', () => {
    expect(() => assertTransition('PROGRAMADA', 'EN_CURSO')).not.toThrow();
    expect(() => assertTransition('PROGRAMADA', 'CANCELADA')).not.toThrow();
    expect(() => assertTransition('REPROGRAMADA', 'EN_CURSO')).not.toThrow();
  });

  it('lets a meeting in progress finish', () => {
    expect(() => assertTransition('EN_CURSO', 'FINALIZADA')).not.toThrow();
  });

  it('refuses to call off a meeting that is already running', () => {
    expect(() => assertTransition('EN_CURSO', 'CANCELADA')).toThrow(
      'No se puede cambiar de EN_CURSO a CANCELADA',
    );
  });

  /**
   * A finished or cancelled meeting is history. The legacy admin endpoint wrote
   * any state it was given, which is how a finished meeting could be dragged
   * back to booked and lose the hour it actually ran at.
   */
  it.each(['FINALIZADA', 'CANCELADA'])('refuses to move a %s meeting at all', (from) => {
    expect(() => assertTransition(from, 'EN_CURSO')).toThrow(ConflictError);
    expect(() => assertTransition(from, 'PROGRAMADA')).toThrow(ConflictError);
  });

  it('refuses to move a meeting to the state it is already in', () => {
    expect(() => assertTransition('EN_CURSO', 'EN_CURSO')).toThrow(ConflictError);
  });
});

describe('isLive', () => {
  it('reads a meeting that still stands as live', () => {
    expect(isLive('PROGRAMADA')).toBe(true);
    expect(isLive('REPROGRAMADA')).toBe(true);
    expect(isLive('EN_CURSO')).toBe(true);
  });

  it('reads a meeting that is over as not live', () => {
    expect(isLive('FINALIZADA')).toBe(false);
    expect(isLive('CANCELADA')).toBe(false);
  });
});
