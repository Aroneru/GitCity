import { describe, expect, it } from 'vitest';
import { buildingSeed, citySeed, compareNames, createRng, hash32 } from './seed';

describe('hash32', () => {
  it('is stable and fits in an unsigned 32-bit integer', () => {
    const h = hash32('gitcity');
    expect(hash32('gitcity')).toBe(h);
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(2 ** 32);
  });

  it('separates similar inputs', () => {
    expect(hash32('repo-1')).not.toBe(hash32('repo-2'));
    expect(hash32('')).not.toBe(hash32(' '));
  });
});

describe('createRng', () => {
  const draw = (seed: number, n: number) => {
    const rng = createRng(seed);
    return Array.from({ length: n }, () => rng.next());
  };

  it('replays the same sequence for the same seed', () => {
    expect(draw(42, 50)).toEqual(draw(42, 50));
  });

  it('gives different sequences for different seeds', () => {
    expect(draw(1, 10)).not.toEqual(draw(2, 10));
  });

  it('keeps every helper within its range', () => {
    const rng = createRng(7);
    const ints = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const f = rng.next();
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
      const n = rng.int(3, 6);
      ints.add(n);
      const x = rng.float(-2, 2);
      expect(x).toBeGreaterThanOrEqual(-2);
      expect(x).toBeLessThan(2);
    }
    expect([...ints].sort()).toEqual([3, 4, 5, 6]);
  });

  it('forks streams that ignore how much the parent has drawn', () => {
    const fresh = createRng(99);
    const used = createRng(99);
    used.next();
    used.int(0, 10);
    expect(fresh.fork('signs').next()).toBe(used.fork('signs').next());
    expect(fresh.fork('signs').next()).not.toBe(fresh.fork('poles').next());
  });

  it('shuffles into a permutation without touching the input', () => {
    const input = ['a', 'b', 'c', 'd', 'e', 'f'];
    const shuffled = createRng(5).shuffle(input);
    expect(input).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
    expect([...shuffled].sort()).toEqual(input);
    expect(createRng(5).shuffle(input)).toEqual(shuffled);
  });

  it('refuses to pick from an empty list', () => {
    expect(() => createRng(1).pick([])).toThrow();
  });
});

describe('citySeed', () => {
  it('ignores the order and case of repo names', () => {
    expect(citySeed('Octocat', ['beta', 'Alpha', 'gamma'])).toBe(citySeed('octocat', ['GAMMA', 'alpha', 'Beta']));
  });

  it('changes with the owner or the set of repos', () => {
    const base = citySeed('octocat', ['alpha', 'beta']);
    expect(citySeed('hubot', ['alpha', 'beta'])).not.toBe(base);
    expect(citySeed('octocat', ['alpha', 'beta', 'gamma'])).not.toBe(base);
  });
});

describe('buildingSeed', () => {
  it('depends only on the owner and repo name, case-insensitively', () => {
    expect(buildingSeed('Octocat', 'Hello-World')).toBe(buildingSeed('octocat', 'hello-world'));
    expect(buildingSeed('octocat', 'hello-world')).not.toBe(buildingSeed('octocat', 'spoon-knife'));
  });
});

describe('compareNames', () => {
  it('sorts case-insensitively with a stable tie-break', () => {
    expect(['beta', 'Alpha', 'alpha', 'Gamma'].sort(compareNames)).toEqual(['Alpha', 'alpha', 'beta', 'Gamma']);
  });
});
