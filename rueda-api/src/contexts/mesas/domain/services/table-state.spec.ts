import { describe, expect, it } from 'vitest';
import { computeTableState } from './table-state.js';

const meeting = (estadoReunion: string) => ({ estadoReunion });

describe('computeTableState', () => {
  it('reads a table with nothing on it as free', () => {
    expect(computeTableState([], 0)).toBe('LIBRE');
  });

  it('reads a table hosting a meeting right now as in use', () => {
    expect(computeTableState([meeting('EN_CURSO')], 0)).toBe('EN_USO');
  });

  it.each(['PROGRAMADA', 'REPROGRAMADA'])('reads a %s meeting as booked', (estado) => {
    expect(computeTableState([meeting(estado)], 0)).toBe('RESERVADA');
  });

  it('lets a meeting in progress win over one merely booked', () => {
    expect(computeTableState([meeting('PROGRAMADA'), meeting('EN_CURSO')], 0)).toBe('EN_USO');
  });

  it('ignores meetings that no longer stand', () => {
    expect(computeTableState([meeting('CANCELADA'), meeting('FINALIZADA')], 0)).toBe('LIBRE');
  });

  /**
   * A pending request naming a table is an intention, not a booking. It shows so
   * the staff sees it coming, but it never outranks a real meeting.
   */
  it('reads a free table with a request waiting as pre-booked', () => {
    expect(computeTableState([], 2)).toBe('PRE_RESERVADA');
  });

  it('keeps a booked table booked even with requests waiting', () => {
    expect(computeTableState([meeting('PROGRAMADA')], 3)).toBe('RESERVADA');
  });
});
