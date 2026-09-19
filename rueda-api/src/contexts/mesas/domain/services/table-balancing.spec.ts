import { describe, expect, it } from 'vitest';
import { pickBalancedTable } from './table-balancing.js';

/** Deterministic stand-in for the random tiebreak. */
const byId = (id: number) => id;

describe('pickBalancedTable', () => {
  it('picks the table that has hosted the fewest meetings', () => {
    const free = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const usage = new Map([
      [1, 5],
      [2, 1],
      [3, 3],
    ]);

    expect(pickBalancedTable(free, usage, byId)).toBe(2);
  });

  it('treats a table that has hosted nothing as the least used', () => {
    const free = [{ id: 1 }, { id: 9 }];
    const usage = new Map([[1, 2]]);

    expect(pickBalancedTable(free, usage, byId)).toBe(9);
  });

  /**
   * The tiebreak is random in production so two requests arriving together do
   * not both pick the same table and then fight over it.
   */
  it('breaks a tie with the tiebreaker it was given', () => {
    const free = [{ id: 7 }, { id: 3 }];
    const usage = new Map<number, number>();

    expect(pickBalancedTable(free, usage, byId)).toBe(3);
    expect(pickBalancedTable(free, usage, (id) => -id)).toBe(7);
  });

  it('offers nothing when no table is free', () => {
    expect(pickBalancedTable([], new Map(), byId)).toBeNull();
  });
});
