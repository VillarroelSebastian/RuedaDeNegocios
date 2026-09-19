import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../../../shared/domain/errors/domain.error.js';
import { planLiveTransition } from './live-status.js';

const NOW = new Date('2026-11-10T13:00:00.000Z');
const EARLIER = new Date('2026-11-10T12:00:00.000Z');
const PENDING = { estadoEnVivo: 'PENDIENTE', horaInicioReal: null, horaFinReal: null };

describe('planLiveTransition', () => {
  it('refuses a state the schedule does not have', () => {
    expect(() => planLiveTransition(PENDING, 'EMPEZANDO', NOW)).toThrow(
      'Estado inválido. Usa PENDIENTE, EN_VIVO o FINALIZADA.',
    );
    expect(() => planLiveTransition(PENDING, 'EMPEZANDO', NOW)).toThrow(ValidationError);
  });

  it('accepts the state however it was typed', () => {
    expect(planLiveTransition(PENDING, 'en_vivo', NOW).estadoEnVivo).toBe('EN_VIVO');
  });

  it('stamps the real start the first time an activity goes live', () => {
    const transition = planLiveTransition(PENDING, 'EN_VIVO', NOW);

    expect(transition.horaInicioReal).toBe(NOW);
    expect(transition.notifySubscribers).toBe(true);
  });

  it('keeps the real start of an activity that is already live', () => {
    const transition = planLiveTransition(
      { estadoEnVivo: 'EN_VIVO', horaInicioReal: EARLIER, horaFinReal: null },
      'EN_VIVO',
      NOW,
    );

    expect(transition.horaInicioReal).toBeNull();
    // Re-saving a note must not tell everyone the activity started again.
    expect(transition.notifySubscribers).toBe(false);
  });

  it('stamps the real end the first time an activity finishes', () => {
    const transition = planLiveTransition(
      { estadoEnVivo: 'EN_VIVO', horaInicioReal: EARLIER, horaFinReal: null },
      'FINALIZADA',
      NOW,
    );

    expect(transition.horaFinReal).toBe(NOW);
    expect(transition.notifySubscribers).toBe(false);
  });

  it('keeps the real end of an activity that already finished', () => {
    const transition = planLiveTransition(
      { estadoEnVivo: 'FINALIZADA', horaInicioReal: EARLIER, horaFinReal: EARLIER },
      'FINALIZADA',
      NOW,
    );

    expect(transition.horaFinReal).toBeNull();
  });

  it('announces an activity brought back to live after it had finished', () => {
    const transition = planLiveTransition(
      { estadoEnVivo: 'FINALIZADA', horaInicioReal: EARLIER, horaFinReal: EARLIER },
      'EN_VIVO',
      NOW,
    );

    expect(transition.notifySubscribers).toBe(true);
    expect(transition.horaInicioReal).toBeNull();
  });

  it('carries the note the staff wrote, trimmed', () => {
    expect(planLiveTransition(PENDING, 'EN_VIVO', NOW, '  Empieza 10 min tarde ').notaEnVivo).toBe(
      'Empieza 10 min tarde',
    );
    expect(planLiveTransition(PENDING, 'EN_VIVO', NOW, '   ').notaEnVivo).toBeNull();
    expect(planLiveTransition(PENDING, 'EN_VIVO', NOW).notaEnVivo).toBeNull();
  });

  it('caps a note at the width of its column', () => {
    expect(planLiveTransition(PENDING, 'EN_VIVO', NOW, 'n'.repeat(400)).notaEnVivo).toHaveLength(
      305,
    );
  });
});
