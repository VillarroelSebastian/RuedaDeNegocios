import { describe, expect, it } from 'vitest';
import {
  closingNotice,
  meetingClock,
  minutesLeft,
  reminderMessage,
  startedMessage,
} from './meeting-automation.js';

describe('minutesLeft', () => {
  it('rounds up, so thirty seconds left still reads as a minute', () => {
    const now = new Date('2026-09-20T17:00:00.000Z');

    expect(minutesLeft(now, new Date('2026-09-20T17:00:30.000Z'))).toBe(1);
    expect(minutesLeft(now, new Date('2026-09-20T17:04:10.000Z'))).toBe(5);
  });

  it('never reads as zero minutes, however little is left', () => {
    const now = new Date('2026-09-20T17:00:00.000Z');

    expect(minutesLeft(now, now)).toBe(1);
  });
});

describe('closingNotice', () => {
  it('warns once at five minutes and again at two', () => {
    expect(closingNotice(5).tipo).toBe('reunion:finaliza-5m');
    expect(closingNotice(3).tipo).toBe('reunion:finaliza-5m');
    expect(closingNotice(2).tipo).toBe('reunion:finaliza-2m');
    expect(closingNotice(1).tipo).toBe('reunion:finaliza-2m');
  });

  it('changes the wording when the end is imminent', () => {
    expect(closingNotice(5).titulo).toBe('Quedan pocos minutos');
    expect(closingNotice(2).titulo).toBe('La reunión está por terminar');
  });

  it('says how many minutes are left', () => {
    expect(closingNotice(4).mensaje).toContain('4 minuto(s)');
  });
});

describe('meetingClock', () => {
  it('reads the hour in the event zone, not in UTC', () => {
    expect(meetingClock(new Date('2026-09-20T17:00:00.000Z'))).toBe('13:00');
  });
});

describe('reminderMessage', () => {
  it('names the counterpart, the hour and the table', () => {
    const message = reminderMessage('Beta', new Date('2026-09-20T17:00:00.000Z'), 5);

    expect(message).toBe('Tu reunión con Beta comienza a las 13:00 en la Mesa 5. ¡No llegues tarde!');
  });

  it('leaves the table out when there is none', () => {
    const message = reminderMessage('Beta', new Date('2026-09-20T17:00:00.000Z'), null);

    expect(message).toBe('Tu reunión con Beta comienza a las 13:00. ¡No llegues tarde!');
  });

  it('falls back when the other company cannot be named', () => {
    expect(reminderMessage(null, new Date('2026-09-20T17:00:00.000Z'), null)).toContain(
      'con la otra empresa',
    );
  });
});

describe('startedMessage', () => {
  it('points a virtual meeting at its link', () => {
    expect(startedMessage('VIRTUAL')).toContain('enlace');
    expect(startedMessage('MIXTA')).toContain('enlace');
  });

  it('just announces an in-person one', () => {
    expect(startedMessage('PRESENCIAL')).toBe(
      'La hora acordada llegó y tu reunión comenzó automáticamente.',
    );
  });
});
