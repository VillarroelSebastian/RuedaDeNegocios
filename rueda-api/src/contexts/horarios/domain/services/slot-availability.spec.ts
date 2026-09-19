import { describe, expect, it } from 'vitest';
import { boliviaDateTime } from '../../../../shared/domain/bolivia-time.js';
import {
  type AvailabilityConstraints,
  buildAgenda,
  parseStoredAvailability,
  slotState,
} from './slot-availability.js';

const SLOT = {
  inicio: boliviaDateTime('2026-11-10', 9, 0),
  fin: boliviaDateTime('2026-11-10', 9, 20),
};

/** Long before the slot, so nothing is in the past unless a test says so. */
const NOW = boliviaDateTime('2026-11-10', 7, 0);

function constraintsOf(
  overrides: Partial<AvailabilityConstraints> = {},
): AvailabilityConstraints {
  return {
    now: NOW,
    cleanupMinutes: 10,
    meetings: [],
    pendingRequests: [],
    blocks: [],
    receiverRanges: [],
    dailyAvailability: [],
    ignoreCompanyAvailability: false,
    ...overrides,
  };
}

const window = (fromHour: number, fromMinute: number, toHour: number, toMinute: number) => ({
  start: boliviaDateTime('2026-11-10', fromHour, fromMinute),
  end: boliviaDateTime('2026-11-10', toHour, toMinute),
});

describe('slotState', () => {
  it('reads an empty slot as available', () => {
    expect(slotState(SLOT, constraintsOf())).toBe('DISPONIBLE');
  });

  it('reads a slot that already started as past', () => {
    expect(slotState(SLOT, constraintsOf({ now: boliviaDateTime('2026-11-10', 9, 0) }))).toBe(
      'PASADO',
    );
  });

  /**
   * A slot that has gone must never be offered, whatever else is true about it.
   * Showing it as busy invited people to ask why they could not book it.
   */
  it('reads a past slot as past even when it also clashes', () => {
    const constraints = constraintsOf({
      now: boliviaDateTime('2026-11-10', 12, 0),
      meetings: [window(9, 0, 9, 20)],
      pendingRequests: [window(9, 0, 9, 20)],
    });

    expect(slotState(SLOT, constraints)).toBe('PASADO');
  });

  it('reads a slot taken by a meeting as busy', () => {
    expect(slotState(SLOT, constraintsOf({ meetings: [window(9, 10, 9, 30)] }))).toBe('OCUPADO');
  });

  it('reads a slot claimed by a waiting request as pending', () => {
    expect(slotState(SLOT, constraintsOf({ pendingRequests: [window(9, 0, 9, 20)] }))).toBe(
      'PENDIENTE',
    );
  });

  it('lets a waiting request outrank a booked meeting', () => {
    const constraints = constraintsOf({
      meetings: [window(9, 0, 9, 20)],
      pendingRequests: [window(9, 0, 9, 20)],
    });

    expect(slotState(SLOT, constraints)).toBe('PENDIENTE');
  });

  it('keeps the cleanup time free around a meeting', () => {
    // The meeting ends at 08:55, but the room is not ready again until 09:05.
    expect(slotState(SLOT, constraintsOf({ meetings: [window(8, 35, 8, 55)] }))).toBe('OCUPADO');
  });

  it('lets a meeting sit right outside the cleanup time', () => {
    expect(slotState(SLOT, constraintsOf({ meetings: [window(8, 30, 8, 50)] }))).toBe(
      'DISPONIBLE',
    );
  });

  it('reads a slot the company blocked as unavailable', () => {
    expect(slotState(SLOT, constraintsOf({ blocks: [window(9, 0, 9, 20)] }))).toBe(
      'NO_DISPONIBLE',
    );
  });

  it('applies no cleanup time to a block, which is not a meeting', () => {
    expect(slotState(SLOT, constraintsOf({ blocks: [window(8, 30, 9, 0)] }))).toBe('DISPONIBLE');
  });

  describe('hours the receiving company declared', () => {
    it('accepts any hour when it declared none', () => {
      expect(slotState(SLOT, constraintsOf({ receiverRanges: [] }))).toBe('DISPONIBLE');
    });

    it('needs the whole meeting to fit inside one range', () => {
      expect(
        slotState(SLOT, constraintsOf({ receiverRanges: [{ desde: '09:00', hasta: '09:20' }] })),
      ).toBe('DISPONIBLE');
      expect(
        slotState(SLOT, constraintsOf({ receiverRanges: [{ desde: '09:00', hasta: '09:10' }] })),
      ).toBe('NO_DISPONIBLE');
    });

    it('accepts a meeting inside any of the declared ranges', () => {
      const ranges = [
        { desde: '14:00', hasta: '17:00' },
        { desde: '08:30', hasta: '10:00' },
      ];

      expect(slotState(SLOT, constraintsOf({ receiverRanges: ranges }))).toBe('DISPONIBLE');
    });
  });

  describe('availability each company declared per day', () => {
    const day = (habilitado: boolean, rangos: { desde: string; hasta: string }[]) => [
      [{ fecha: '2026-11-10', habilitado, rangos }],
    ];

    it('accepts a day nobody configured', () => {
      const constraints = constraintsOf({
        dailyAvailability: [[{ fecha: '2026-11-11', habilitado: true, rangos: [] }]],
      });

      expect(slotState(SLOT, constraints)).toBe('DISPONIBLE');
    });

    it('refuses a day the company turned off', () => {
      expect(slotState(SLOT, constraintsOf({ dailyAvailability: day(false, []) }))).toBe(
        'NO_DISPONIBLE',
      );
    });

    it('needs the whole meeting to fit inside one of the day ranges', () => {
      expect(
        slotState(
          SLOT,
          constraintsOf({ dailyAvailability: day(true, [{ desde: '08:00', hasta: '12:00' }]) }),
        ),
      ).toBe('DISPONIBLE');
      expect(
        slotState(
          SLOT,
          constraintsOf({ dailyAvailability: day(true, [{ desde: '10:00', hasta: '12:00' }]) }),
        ),
      ).toBe('NO_DISPONIBLE');
    });

    it('refuses the slot when either company is unavailable', () => {
      const constraints = constraintsOf({
        dailyAvailability: [
          [{ fecha: '2026-11-10', habilitado: true, rangos: [{ desde: '08:00', hasta: '12:00' }] }],
          [{ fecha: '2026-11-10', habilitado: false, rangos: [] }],
        ],
      });

      expect(slotState(SLOT, constraints)).toBe('NO_DISPONIBLE');
    });
  });

  /**
   * The event team books on behalf of both companies, so it sees past the hours
   * they declared. What it can never see past is a meeting that already exists.
   */
  it('looks past what the companies declared when the team is booking', () => {
    const constraints = constraintsOf({
      ignoreCompanyAvailability: true,
      blocks: [window(9, 0, 9, 20)],
      receiverRanges: [{ desde: '14:00', hasta: '17:00' }],
      dailyAvailability: [[{ fecha: '2026-11-10', habilitado: false, rangos: [] }]],
    });

    expect(slotState(SLOT, constraints)).toBe('DISPONIBLE');
  });

  it('still refuses a slot already taken when the team is booking', () => {
    const constraints = constraintsOf({
      ignoreCompanyAvailability: true,
      meetings: [window(9, 0, 9, 20)],
    });

    expect(slotState(SLOT, constraints)).toBe('OCUPADO');
  });
});

describe('parseStoredAvailability', () => {
  it('reads what the company saved', () => {
    const stored = JSON.stringify([
      { fecha: '2026-11-10', habilitado: true, rangos: [{ desde: '08:00', hasta: '12:00' }] },
    ]);

    expect(parseStoredAvailability(stored)).toEqual([
      { fecha: '2026-11-10', habilitado: true, rangos: [{ desde: '08:00', hasta: '12:00' }] },
    ]);
  });

  it('treats nothing saved as nothing declared', () => {
    expect(parseStoredAvailability(null)).toEqual([]);
    expect(parseStoredAvailability('')).toEqual([]);
  });

  /**
   * Unreadable configuration must not turn into a wall: it means the company
   * declared nothing, not that every slot is refused.
   */
  it('treats unreadable configuration as nothing declared', () => {
    expect(parseStoredAvailability('{not json')).toEqual([]);
    expect(parseStoredAvailability('"a string"')).toEqual([]);
  });

  it('drops a day without a date and defaults a missing flag to enabled', () => {
    const stored = JSON.stringify([{ rangos: [] }, { fecha: '2026-11-10' }]);

    expect(parseStoredAvailability(stored)).toEqual([
      { fecha: '2026-11-10', habilitado: true, rangos: [] },
    ]);
  });
});

describe('buildAgenda', () => {
  it('states every slot and flags the ones that can be taken', () => {
    const slots = [SLOT, { inicio: window(10, 0, 10, 20).start, fin: window(10, 0, 10, 20).end }];
    const agenda = buildAgenda(slots, constraintsOf({ meetings: [window(10, 0, 10, 20)] }));

    expect(agenda[0]).toEqual({
      inicio: '2026-11-10T13:00:00.000Z',
      fin: '2026-11-10T13:20:00.000Z',
      disponible: true,
      estado: 'DISPONIBLE',
    });
    expect(agenda[1].disponible).toBe(false);
    expect(agenda[1].estado).toBe('OCUPADO');
  });
});
