import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../../../shared/domain/errors/domain.error.js';
import { EARLY_START_WINDOW_MINUTES, planStart } from './early-start.js';

const SCHEDULED = new Date('2026-11-10T14:00:00.000Z');
const ME = 100;
const THEM = 200;

describe('planStart', () => {
  it('starts a meeting whose hour has come', () => {
    const plan = planStart({
      scheduledAt: SCHEDULED,
      now: SCHEDULED,
      askedBy: null,
      callerId: ME,
    });

    expect(plan).toEqual({ accion: 'INICIAR' });
  });

  it('starts a meeting whose hour has passed', () => {
    const plan = planStart({
      scheduledAt: SCHEDULED,
      now: new Date('2026-11-10T14:30:00.000Z'),
      askedBy: null,
      callerId: ME,
    });

    expect(plan.accion).toBe('INICIAR');
  });

  /**
   * Before the hour it takes both companies: one asks, the other agrees by
   * pressing the same button. Nobody is dragged into a meeting early.
   */
  it('records the first company asking to start early', () => {
    const plan = planStart({
      scheduledAt: SCHEDULED,
      now: new Date('2026-11-10T13:55:00.000Z'),
      askedBy: null,
      callerId: ME,
    });

    expect(plan).toEqual({ accion: 'PEDIR', solicitadoPor: ME });
  });

  it('starts the meeting once the other company agrees', () => {
    const plan = planStart({
      scheduledAt: SCHEDULED,
      now: new Date('2026-11-10T13:55:00.000Z'),
      askedBy: THEM,
      callerId: ME,
    });

    expect(plan.accion).toBe('INICIAR');
  });

  it('keeps waiting when the same company presses again', () => {
    const plan = planStart({
      scheduledAt: SCHEDULED,
      now: new Date('2026-11-10T13:55:00.000Z'),
      askedBy: ME,
      callerId: ME,
    });

    expect(plan).toEqual({ accion: 'ESPERAR' });
  });

  it('refuses to start long before the hour, saying when it may be asked', () => {
    expect(() =>
      planStart({
        scheduledAt: SCHEDULED,
        now: new Date('2026-11-10T12:00:00.000Z'),
        askedBy: null,
        callerId: ME,
      }),
    ).toThrow(`Podrás solicitar el inicio anticipado ${EARLY_START_WINDOW_MINUTES} minutos antes`);
  });

  it('names the scheduled hour in the event time zone', () => {
    expect(() =>
      planStart({
        scheduledAt: SCHEDULED,
        now: new Date('2026-11-10T12:00:00.000Z'),
        askedBy: null,
        callerId: ME,
      }),
    ).toThrow(/10:00/);
  });

  it('raises a validation error, not a plain one', () => {
    expect(() =>
      planStart({
        scheduledAt: SCHEDULED,
        now: new Date('2026-11-10T12:00:00.000Z'),
        askedBy: null,
        callerId: ME,
      }),
    ).toThrow(ValidationError);
  });

  it('opens the window exactly at the edge', () => {
    const plan = planStart({
      scheduledAt: SCHEDULED,
      now: new Date('2026-11-10T13:50:00.000Z'),
      askedBy: null,
      callerId: ME,
    });

    expect(plan.accion).toBe('PEDIR');
  });
});
