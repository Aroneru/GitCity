import type { BuildingKind, RooftopTier, WidthTier } from './rules';

/**
 * World geometry in art pixels. The renderer draws at exactly this scale
 * before upscaling, and the layout uses it to place things without overlap.
 * World y grows downward; the building line (ground) is y = 0.
 */

/** Japanese sign glyphs are 16×16 cells (DotGothic16 at its native size). */
export const GLYPH = 16;
/** Padding between a sign's edge and its glyphs, per side. */
export const SIGN_PAD = 3;

export const GEOMETRY = {
  groundFloor: 24,
  floor: 10,
  parapet: 3,
  widths: { S: 32, M: 44, L: 56 } satisfies Record<WidthTier, number>,
  izakaya: {
    widths: { S: 40, M: 48, L: 48 } satisfies Record<WidthTier, number>,
    ground: 26,
    upper: 12,
    roof: 7,
  },
  /** How far rooftop details reach above the roof. */
  rooftopExtra: { none: 10, antenna: 24, billboard: 26, beacon: 46 } satisfies Record<RooftopTier, number>,
} as const;

/** Street bands below the building line: far sidewalk, road, near sidewalk. */
export const STREET = { sidewalk: 10, road: 30, nearSidewalk: 8 } as const;
export const STREET_DEPTH = STREET.sidewalk + STREET.road + STREET.nearSidewalk;

export const PROP_WIDTH = {
  vending: 11,
  bicycles: 21,
  plants: 7,
  crates: 9,
  trafficLight: 5,
  pole: 3,
} as const;
export type PropKind = keyof typeof PROP_WIDTH;

export const FIXTURE_WIDTH = { konbini: 64, yatai: 52, shrine: 48, lot: 72 } as const;
export type FixtureKind = keyof typeof FIXTURE_WIDTH;

export const CROSSING_WIDTH = 48;
export const EDGE_MARGIN = 40;
export const UTILITY_POLE_HEIGHT = 96;

export function buildingWidth(kind: BuildingKind, tier: WidthTier): number {
  return kind === 'izakaya' ? GEOMETRY.izakaya.widths[tier] : GEOMETRY.widths[tier];
}

export function buildingHeight(kind: BuildingKind, floors: number): number {
  if (kind === 'izakaya') {
    const { ground, upper, roof } = GEOMETRY.izakaya;
    return ground + (floors - 1) * upper + roof;
  }
  return GEOMETRY.groundFloor + (floors - 1) * GEOMETRY.floor + GEOMETRY.parapet;
}

/** Outer size of a sign holding `chars` glyphs along its long side. */
export function signLength(chars: number): number {
  return chars * GLYPH + SIGN_PAD * 2;
}

/** How many glyphs a horizontal sign may hold; it may overhang the facade by 4px a side. */
export function maxHorizontalChars(width: number): number {
  return Math.max(1, Math.floor((width + 8 - SIGN_PAD * 2) / GLYPH));
}

/** How many glyphs fit on a vertical sign between the shop front and the parapet. */
export function maxVerticalChars(height: number): number {
  const available = height - GEOMETRY.groundFloor - GEOMETRY.parapet + 2;
  return Math.max(1, Math.floor((available - SIGN_PAD * 2) / GLYPH));
}
