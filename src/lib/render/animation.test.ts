import { describe, expect, it } from 'vitest';
import { beaconOn, neonLevel, noise, windowFlipped } from './animation';

/** Share of `samples` evenly spaced times in [0, span) for which `test` holds. */
function share(test: (t: number) => boolean, span = 600, samples = 6000): number {
  let hits = 0;
  for (let i = 0; i < samples; i++) if (test((i / samples) * span)) hits++;
  return hits / samples;
}

describe('noise', () => {
  it('is deterministic and stays in [0, 1)', () => {
    for (let n = 0; n < 500; n++) {
      const value = noise(42, n);
      expect(value).toBe(noise(42, n));
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
    expect(noise(1, 5)).not.toBe(noise(2, 5));
  });
});

describe('neonLevel', () => {
  it('keeps steady signs fully lit', () => {
    expect(share((t) => neonLevel(7, 'steady', t) === 1)).toBe(1);
  });

  it('lets flickery signs stutter only briefly', () => {
    const lit = share((t) => neonLevel(7, 'flickery', t) === 1);
    expect(lit).toBeGreaterThan(0.95);
    expect(lit).toBeLessThan(1);
  });

  it('keeps broken signs dark for long spells, with some sputtering', () => {
    const lit = share((t) => neonLevel(7, 'broken', t) > 0);
    expect(lit).toBeGreaterThan(0.15);
    expect(lit).toBeLessThan(0.6);
  });

  it('gives every sign its own rhythm', () => {
    const pattern = (seed: number) => Array.from({ length: 200 }, (_, i) => neonLevel(seed, 'broken', i * 0.1)).join();
    expect(pattern(1)).not.toBe(pattern(2));
    expect(pattern(1)).toBe(pattern(1));
  });
});

describe('beaconOn', () => {
  it('blinks on for a bit under half of each cycle', () => {
    const on = share((t) => beaconOn(3, t), 140, 14000);
    expect(on).toBeGreaterThan(0.35);
    expect(on).toBeLessThan(0.45);
  });
});

describe('windowFlipped', () => {
  it('flips only a few windows at a time', () => {
    let flipped = 0;
    const windows = 4000;
    for (let seed = 0; seed < windows; seed++) if (windowFlipped(seed * 7919, 123.4)) flipped++;
    expect(flipped / windows).toBeGreaterThan(0.03);
    expect(flipped / windows).toBeLessThan(0.1);
  });
});
