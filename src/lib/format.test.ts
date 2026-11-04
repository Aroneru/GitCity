import { describe, expect, it } from 'vitest';
import { describeBuilding, formatCount, formatDate, kindLabel, storeys } from './format';

describe('describeBuilding', () => {
  it('reads like a short description of the building', () => {
    expect(describeBuilding({ kind: 'tower', floors: 15, widthTier: 'L', rooftop: 'beacon' })).toBe('15-floor tower · wide · red beacon (1000★+)');
    expect(describeBuilding({ kind: 'shop', floors: 2, widthTier: 'S', rooftop: 'none' })).toBe('2-floor shop · narrow');
    expect(describeBuilding({ kind: 'midrise', floors: 7, widthTier: 'M', rooftop: 'antenna' })).toBe('7-floor mid-rise · medium width · antenna (10★+)');
  });
});

describe('formatting helpers', () => {
  it('formats counts, compacting very large ones', () => {
    expect(formatCount(1234)).toBe('1,234');
    expect(formatCount(1_300_000)).toBe('1.3M');
  });

  it('formats dates in UTC and handles missing ones', () => {
    expect(formatDate('2026-10-31T23:30:00Z')).toBe('Oct 31, 2026');
    expect(formatDate(null)).toBe('never');
  });

  it('labels kinds and floors', () => {
    expect(kindLabel('midrise')).toBe('mid-rise');
    expect(storeys(1)).toBe('1 floor');
    expect(storeys(9)).toBe('9 floors');
  });
});
