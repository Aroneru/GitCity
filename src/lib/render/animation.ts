/**
 * Time-based animation as pure functions of a seed and the time in seconds.
 * Nothing is stored per sign or window: every frame asks "how lit is this
 * right now?", which keeps animation cheap, deterministic and testable.
 */

/** Deterministic noise in [0, 1) from a seed and an integer. */
export function noise(seed: number, n: number): number {
  let h = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((n | 0) + 0x632be5ab, 0xc2b2ae35);
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Steady signs never blink; flickery ones stutter now and then; broken ones sputter. */
export type SignBehavior = 'steady' | 'flickery' | 'broken';

/** How lit a sign is at time `t`, from 0 (dark) to 1. */
export function neonLevel(seed: number, behavior: SignBehavior, t: number): number {
  if (behavior === 'steady') return 1;
  if (behavior === 'broken') {
    // Long dead spells, broken by bursts of quick sputtering.
    const spell = Math.floor(t / 2.5);
    if (noise(seed, spell) < 0.45) return 0;
    return noise(seed + 1, Math.floor(t / 0.11)) < 0.55 ? 1 : 0;
  }
  // Flickery: in some 7-second windows, a half-second burst of blinks.
  const period = 7;
  const slot = Math.floor(t / period);
  if (noise(seed, slot) > 0.3) return 1;
  const into = t - slot * period - noise(seed + 7, slot) * (period - 0.6);
  if (into < 0 || into > 0.5) return 1;
  return Math.floor(into / 0.07) % 2 === 0 ? 0.2 : 1;
}

/** The rooftop beacon: a slow red blink, each with its own phase. */
export function beaconOn(seed: number, t: number): boolean {
  const period = 1.4;
  return (t + noise(seed, 0) * period) % period < 0.55;
}

/** Whether a window is, for now, the opposite of its usual state (someone flicked a switch). */
export function windowFlipped(seed: number, t: number): boolean {
  const period = 20 + noise(seed, 1) * 60;
  const slot = Math.floor((t + noise(seed, 2) * period) / period);
  return noise(seed, slot + 3) < 0.06;
}
