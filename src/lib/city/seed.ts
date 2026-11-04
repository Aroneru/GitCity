/**
 * Deterministic hashing and pseudo-random numbers.
 *
 * Every random choice in a city comes from a seeded stream, so the same
 * input always produces the same city. Streams can fork into named
 * sub-streams that don't depend on how many numbers the parent has drawn,
 * which keeps one feature's randomness from shifting another's.
 */

/** 32-bit FNV-1a with a murmur3 finalizer for good avalanche. */
export function hash32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

export interface Rng {
  readonly seed: number;
  /** Uniform float in [0, 1). */
  next(): number;
  /** Uniform integer in [min, max], inclusive. */
  int(min: number, max: number): number;
  /** Uniform float in [min, max). */
  float(min: number, max: number): number;
  chance(probability: number): boolean;
  pick<T>(items: readonly T[]): T;
  shuffle<T>(items: readonly T[]): T[];
  /** An independent stream derived from this stream's seed and a label. */
  fork(label: string): Rng;
}

export function createRng(seed: number): Rng {
  // mulberry32: tiny, fast, and plenty for visual randomness.
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const rng: Rng = {
    seed: seed >>> 0,
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    float: (min, max) => min + next() * (max - min),
    chance: (probability) => next() < probability,
    pick: (items) => {
      if (items.length === 0) throw new Error('Cannot pick from an empty list');
      return items[Math.floor(next() * items.length)];
    },
    shuffle: (items) => {
      const result = [...items];
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    },
    fork: (label) => createRng(hash32(`${seed >>> 0}:${label}`)),
  };
  return rng;
}

/** Case-insensitive, locale-independent ordering for repo names. */
export function compareNames(a: string, b: string): number {
  const la = a.toLowerCase();
  const lb = b.toLowerCase();
  if (la !== lb) return la < lb ? -1 : 1;
  return a < b ? -1 : a > b ? 1 : 0;
}

/** The city seed: owner login plus the sorted repo names, case-insensitive. */
export function citySeed(login: string, repoNames: readonly string[]): number {
  const names = repoNames.map((name) => name.toLowerCase()).sort();
  return hash32([login.toLowerCase(), ...names].join('\n'));
}

/** A per-building seed that ignores the rest of the city, so a building keeps its look. */
export function buildingSeed(login: string, repoName: string): number {
  return hash32(`${login.toLowerCase()}/${repoName.toLowerCase()}`);
}
