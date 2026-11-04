import { describe, expect, it } from 'vitest';
import { generateCity } from '../city/layout';
import { makeRepo, makeSnapshot } from '../city/test-helpers';
import { hitTest } from './hit-test';

const layout = generateCity(
  makeSnapshot([
    makeRepo({ name: 'alpha', commitCount: 2000, stars: 0 }),
    makeRepo({ name: 'beta', commitCount: 3 }),
    makeRepo({ name: 'gamma', commitCount: 60 }),
  ]),
);

describe('hitTest', () => {
  it('finds each building from a point on its facade', () => {
    layout.buildings.forEach((b, i) => {
      expect(hitTest(layout, [], b.x + b.width / 2, -b.height / 2)).toBe(i);
    });
  });

  it('counts the rooftop space as part of the building', () => {
    const b = layout.buildings[0];
    expect(hitTest(layout, [], b.x + 1, -b.height - 2)).toBe(0);
  });

  it('misses the sky, the street and the gaps', () => {
    const b = layout.buildings[0];
    expect(hitTest(layout, [], b.x + 1, -1000)).toBeNull();
    expect(hitTest(layout, [], b.x + 1, 5)).toBeNull();
    expect(hitTest(layout, [], -10, -5)).toBeNull();
  });

  it('gives a sign hanging over a neighbour to its own building', () => {
    const second = layout.buildings[1];
    const signOverSecond = { x: second.x + 1, y: -12, w: 6, h: 6 };
    const signs = [signOverSecond, { x: -100, y: -100, w: 1, h: 1 }, { x: -100, y: -100, w: 1, h: 1 }];
    expect(hitTest(layout, signs, second.x + 3, -9)).toBe(0);
    expect(hitTest(layout, signs, second.x + second.width - 2, -2)).toBe(1);
  });
});
