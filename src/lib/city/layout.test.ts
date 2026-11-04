import { describe, expect, it } from 'vitest';
import { createDemoSnapshot } from '../mock/demo';
import { generateCity } from './layout';
import { makeRepo, makeSnapshot } from './test-helpers';

describe('generateCity', () => {
  const demo = createDemoSnapshot();

  it('generates the same city for the same data', () => {
    expect(generateCity(demo)).toEqual(generateCity(createDemoSnapshot()));
  });

  it('does not depend on the order the API returned the repos in', () => {
    const reversed = { ...demo, repos: [...demo.repos].reverse() };
    expect(generateCity(reversed)).toEqual(generateCity(demo));
  });

  it('generates a different city for a different owner', () => {
    const other = generateCity({ ...demo, owner: { ...demo.owner, login: 'someone-else' } });
    const city = generateCity(demo);
    expect(other.seed).not.toBe(city.seed);
    expect(other.buildings.map((b) => b.id)).not.toEqual(city.buildings.map((b) => b.id));
  });

  it('places every repo exactly once', () => {
    const city = generateCity(demo);
    expect(city.buildings.map((b) => b.id).sort()).toEqual(demo.repos.map((r) => r.name).sort());
  });

  it('keeps buildings in order, inside the street, and never overlapping', () => {
    const city = generateCity(demo);
    let right = 0;
    for (const building of city.buildings) {
      expect(building.x).toBeGreaterThanOrEqual(right);
      right = building.x + building.width;
    }
    expect(right).toBeLessThanOrEqual(city.width);
    for (const fixture of city.fixtures) expect(fixture.x + fixture.width).toBeLessThanOrEqual(city.width);
    for (const prop of city.props) expect(prop.x).toBeGreaterThanOrEqual(0);
  });

  it('keeps a building looking the same when other repos change', () => {
    const before = generateCity(demo);
    const after = generateCity({ ...demo, repos: [...demo.repos, makeRepo({ name: 'brand-new-repo' })] });
    for (const building of before.buildings) {
      const same = after.buildings.find((b) => b.id === building.id);
      expect(same?.seed).toBe(building.seed);
      expect(same?.sign.text).toBe(building.sign.text);
    }
  });

  it('gathers forks into izakaya alleys', () => {
    const city = generateCity(demo);
    const izakaya = city.buildings.filter((b) => b.kind === 'izakaya');
    expect(izakaya.length).toBe(demo.repos.filter((r) => r.isFork).length);
    for (const building of izakaya) {
      const inAlley = city.yokocho.some((span) => building.x >= span.x && building.x + building.width <= span.x + span.width);
      expect(inAlley).toBe(true);
    }
  });

  it('never hangs two vertical signs on the same shared edge', () => {
    const city = generateCity(demo);
    for (let i = 1; i < city.buildings.length; i++) {
      const [a, b] = [city.buildings[i - 1], city.buildings[i]];
      const touching = b.x - (a.x + a.width) < 8;
      if (touching && a.sign.orientation === 'vertical' && b.sign.orientation === 'vertical') {
        expect(a.sign.side === 'right' && b.sign.side === 'left').toBe(false);
      }
    }
  });

  it('puts the tallest building toward the middle of the street', () => {
    const city = generateCity(demo);
    const tallest = city.buildings.reduce((best, b) => (b.height > best.height ? b : best));
    const center = (tallest.x + tallest.width / 2) / city.width;
    expect(center).toBeGreaterThan(0.2);
    expect(center).toBeLessThan(0.8);
  });

  it('reports a skyline tall enough for every rooftop', () => {
    const city = generateCity(demo);
    for (const building of city.buildings) expect(city.skylineHeight).toBeGreaterThanOrEqual(building.height);
  });

  it('builds an empty lot for an owner with no repos', () => {
    const city = generateCity(makeSnapshot([]));
    expect(city.buildings).toEqual([]);
    expect(city.fixtures.map((f) => f.kind)).toEqual(['lot']);
    expect(city.width).toBeGreaterThan(0);
  });

  it('handles a single repo', () => {
    const city = generateCity(makeSnapshot([makeRepo({ name: 'solo' })]));
    expect(city.buildings).toHaveLength(1);
    expect(city.buildings[0].x).toBeGreaterThan(0);
  });

  it('handles the 100-repo cap', () => {
    const repos = Array.from({ length: 100 }, (_, i) =>
      makeRepo({ name: `repo-${i}`, commitCount: (i * 37) % 4000, isFork: i % 9 === 0, stars: (i * 13) % 1200 }),
    );
    const city = generateCity(makeSnapshot(repos));
    expect(city.buildings).toHaveLength(100);
    expect(city.crossings.length).toBeGreaterThan(0);
    expect(city.fixtures.filter((f) => f.kind === 'konbini')).toHaveLength(2);
  });
});
