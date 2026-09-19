import { describe, expect, it } from 'vitest';
import { boliviaDateTime } from '../../../../shared/domain/bolivia-time.js';
import { fixedSlots, startCandidates, technicianCandidates } from './slot-grid.js';

const iso = (date: Date) => date.toISOString();

/** 08:00-10:00 local on one day. */
const MORNING = {
  start: boliviaDateTime('2026-11-10', 8, 0),
  end: boliviaDateTime('2026-11-10', 10, 0),
};

describe('fixedSlots', () => {
  it('lays a grid of meeting plus break over the window', () => {
    const slots = fixedSlots([MORNING], 20, 10);

    expect(slots).toHaveLength(4);
    expect(iso(slots[0].inicio)).toBe('2026-11-10T12:00:00.000Z');
    expect(iso(slots[0].fin)).toBe('2026-11-10T12:20:00.000Z');
    // The next one starts a whole meeting plus a whole break later.
    expect(iso(slots[1].inicio)).toBe('2026-11-10T12:30:00.000Z');
  });

  /**
   * Each day starts exactly at the configured hour. Rounding from midnight
   * pushed 08:00 to 08:10 whenever the block was 35 minutes long.
   */
  it('starts the day at the hour that was configured', () => {
    expect(iso(fixedSlots([MORNING], 25, 10)[0].inicio)).toBe('2026-11-10T12:00:00.000Z');
  });

  it('never lets a meeting run past the end of the window', () => {
    const slots = fixedSlots([MORNING], 50, 10);

    expect(slots).toHaveLength(2);
    expect(iso(slots.at(-1)!.fin)).toBe('2026-11-10T13:50:00.000Z');
  });

  it('lays the grid over every window it is given', () => {
    const afternoon = {
      start: boliviaDateTime('2026-11-10', 14, 0),
      end: boliviaDateTime('2026-11-10', 15, 0),
    };

    expect(fixedSlots([MORNING, afternoon], 30, 0)).toHaveLength(6);
  });

  it('offers nothing when a meeting does not fit the window', () => {
    expect(fixedSlots([MORNING], 180, 10)).toEqual([]);
  });

  it('refuses to build a grid out of a meeting of no length', () => {
    expect(fixedSlots([MORNING], 0, 10)).toEqual([]);
  });
});

describe('startCandidates', () => {
  it('offers a start every five minutes', () => {
    const slots = startCandidates([MORNING], 20);

    expect(iso(slots[0].inicio)).toBe('2026-11-10T12:00:00.000Z');
    expect(iso(slots[1].inicio)).toBe('2026-11-10T12:05:00.000Z');
    // 08:00 through 09:40 can each still fit a 20 minute meeting.
    expect(slots).toHaveLength(21);
  });

  it('rounds a window that does not start on a multiple of five', () => {
    const window = {
      start: boliviaDateTime('2026-11-10', 8, 2),
      end: boliviaDateTime('2026-11-10', 9, 0),
    };

    expect(iso(startCandidates([window], 20)[0].inicio)).toBe('2026-11-10T12:05:00.000Z');
  });
});

describe('technicianCandidates', () => {
  /**
   * The event team may book at any hour of the local day. The only availability
   * it really has to respect is the table's.
   */
  it('covers the whole local day every five minutes', () => {
    const slots = technicianCandidates(['2026-11-10'], 20);

    expect(iso(slots[0].inicio)).toBe('2026-11-10T04:00:00.000Z');
    expect(iso(slots.at(-1)!.fin)).toBe('2026-11-11T04:00:00.000Z');
  });

  it('never lets a meeting run past midnight', () => {
    const slots = technicianCandidates(['2026-11-10'], 20);

    expect(slots.every((slot) => slot.fin <= boliviaDateTime('2026-11-11', 0, 0))).toBe(true);
  });

  it('covers every day it is given', () => {
    const oneDay = technicianCandidates(['2026-11-10'], 60).length;

    expect(technicianCandidates(['2026-11-10', '2026-11-11'], 60)).toHaveLength(oneDay * 2);
  });
});
