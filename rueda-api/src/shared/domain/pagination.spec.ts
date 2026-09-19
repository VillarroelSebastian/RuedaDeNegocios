import { describe, expect, it } from 'vitest';
import { clampLimit, clampPage } from './pagination.js';

describe('clampPage', () => {
  it('starts at the first page when none is asked for', () => {
    expect(clampPage(undefined)).toBe(1);
  });

  it('keeps a page that is already valid', () => {
    expect(clampPage(4)).toBe(4);
  });

  it('never goes below the first page', () => {
    expect(clampPage(0)).toBe(1);
    expect(clampPage(-3)).toBe(1);
  });

  it('drops the fraction of a page', () => {
    expect(clampPage(2.9)).toBe(2);
  });

  it('falls back to the first page when the number is not readable', () => {
    expect(clampPage(Number.NaN)).toBe(1);
  });
});

describe('clampLimit', () => {
  it('uses the fallback when no size is asked for', () => {
    expect(clampLimit(undefined, 10, 100)).toBe(10);
  });

  it('keeps a size that is already valid', () => {
    expect(clampLimit(25, 10, 100)).toBe(25);
  });

  it('caps the size, so one request cannot pull the whole table', () => {
    expect(clampLimit(5000, 10, 100)).toBe(100);
  });

  it('falls back when the size is zero or not readable', () => {
    expect(clampLimit(0, 10, 100)).toBe(10);
    expect(clampLimit(Number.NaN, 10, 100)).toBe(10);
  });

  it('never returns less than one row', () => {
    expect(clampLimit(-8, 10, 100)).toBe(1);
  });
});
