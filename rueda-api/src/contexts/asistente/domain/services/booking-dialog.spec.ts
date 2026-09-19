import { describe, expect, it } from 'vitest';
import {
  type BookingCandidate,
  pickCandidate,
  pickHour,
  pickMeetingType,
  pickPeriodHour,
  pickSlot,
  pickTable,
  readConfirmation,
  wantsToCancel,
} from './booking-dialog.js';

const CANDIDATES: BookingCandidate[] = [
  { id: 11, nombre: 'maderas del norte', codigo: 'rb-mad-1' },
  { id: 22, nombre: 'constructora sur', codigo: 'rb-con-2' },
];

/** 13:00, 13:20 and 17:00 in Bolivia, which runs at UTC-4. */
const SLOTS = [
  new Date('2026-09-20T17:00:00.000Z'),
  new Date('2026-09-20T17:20:00.000Z'),
  new Date('2026-09-20T21:00:00.000Z'),
];

/** The same plus 01:00, so "1" could mean either half of the day. */
const DAY_AND_NIGHT = [new Date('2026-09-20T05:00:00.000Z'), ...SLOTS];

describe('wantsToCancel', () => {
  it('recognises the ways out of the flow', () => {
    expect(wantsToCancel('cancelar')).toBe(true);
    expect(wantsToCancel('ya no')).toBe(true);
    expect(wantsToCancel('la 2')).toBe(false);
  });
});

describe('pickCandidate', () => {
  it('takes the number of the list', () => {
    expect(pickCandidate('2', CANDIDATES)?.id).toBe(22);
  });

  it('takes the name', () => {
    expect(pickCandidate('maderas del norte', CANDIDATES)?.id).toBe(11);
  });

  it('takes the code', () => {
    expect(pickCandidate('rb-con-2', CANDIDATES)?.id).toBe(22);
  });

  it('picks nobody when the number is outside the list', () => {
    expect(pickCandidate('9', CANDIDATES)).toBeNull();
  });

  it('picks nobody when nothing was written', () => {
    expect(pickCandidate('   ', CANDIDATES)).toBeNull();
  });
});

describe('pickHour', () => {
  it('cannot read a message without an hour in it', () => {
    expect(pickHour('no se', SLOTS)).toEqual({ kind: 'unreadable' });
  });

  it('takes the stated half of the day', () => {
    expect(pickHour('1 p. m.', SLOTS)).toEqual({ kind: 'single', hour: 13 });
  });

  it('asks which half of the day when both are free', () => {
    expect(pickHour('1', DAY_AND_NIGHT)).toEqual({ kind: 'ambiguous', hours: [1, 13] });
  });

  it('does not ask when only one half of the day is free', () => {
    expect(pickHour('5', SLOTS)).toEqual({ kind: 'single', hour: 17 });
  });

  it('reports an hour nobody is free at', () => {
    expect(pickHour('8 a. m.', SLOTS)).toEqual({ kind: 'unavailable' });
  });
});

describe('pickPeriodHour', () => {
  it('takes the number of the offered options', () => {
    expect(pickPeriodHour('2', [9, 21])).toBe(21);
  });

  it('understands the morning and the afternoon', () => {
    expect(pickPeriodHour('a. m.', [9, 21])).toBe(9);
    expect(pickPeriodHour('p. m.', [9, 21])).toBe(21);
  });

  it('gives up when it is neither', () => {
    expect(pickPeriodHour('no se', [9, 21])).toBeNull();
  });
});

describe('pickSlot', () => {
  const OPTIONS = ['1:00 p. m.', '1:20 p. m.', '5:00 p. m.'];

  it('matches the option the user tapped, text against text', () => {
    expect(pickSlot('1:20 p. m.', SLOTS, OPTIONS)).toEqual(SLOTS[1]);
  });

  it('takes the number of the list', () => {
    expect(pickSlot('3', SLOTS, OPTIONS)).toEqual(SLOTS[2]);
  });

  it('reads a written time, aware of the half of the day', () => {
    expect(pickSlot('5:00 p. m.', SLOTS, [])).toEqual(SLOTS[2]);
  });

  it('gives up on a time that is not on the list', () => {
    expect(pickSlot('11:45', SLOTS, OPTIONS)).toBeNull();
  });
});

describe('pickMeetingType', () => {
  it('reads both kinds of meeting', () => {
    expect(pickMeetingType('virtual')).toBe('VIRTUAL');
    expect(pickMeetingType('presencial por favor')).toBe('PRESENCIAL');
    expect(pickMeetingType('no se')).toBeNull();
  });
});

describe('pickTable', () => {
  const TABLES = [
    { id: 3, numeroMesa: 5 },
    { id: 4, numeroMesa: 6 },
  ];
  const OPTIONS = ['Mesa 5', 'Mesa 6', 'Cualquiera / Automática'];

  it('matches the option the user tapped', () => {
    expect(pickTable('mesa 6', TABLES, OPTIONS)).toEqual({ kind: 'table', tableId: 4 });
  });

  it('takes the number of the list', () => {
    expect(pickTable('1', TABLES, OPTIONS)).toEqual({ kind: 'table', tableId: 3 });
  });

  it('lets the event assign one', () => {
    expect(pickTable('3', TABLES, OPTIONS)).toEqual({ kind: 'automatic' });
    expect(pickTable('cualquiera', TABLES, OPTIONS)).toEqual({ kind: 'automatic' });
  });

  it('gives up on a table that is not free', () => {
    expect(pickTable('mesa 99', TABLES, OPTIONS)).toEqual({ kind: 'unreadable' });
  });
});

describe('readConfirmation', () => {
  it('sends on an agreement', () => {
    expect(readConfirmation('si')).toBe('send');
    expect(readConfirmation('dale')).toBe('send');
  });

  it('cancels on a refusal', () => {
    expect(readConfirmation('no')).toBe('cancel');
    expect(readConfirmation('mejor cancelar')).toBe('cancel');
  });

  it('asks again when it is neither', () => {
    expect(readConfirmation('quizas')).toBe('unclear');
  });
});
