import type { FixtureKind, PropKind } from './geometry';
import type { BuildingSpec } from './rules';

export interface Sign {
  text: string;
  orientation: 'vertical' | 'horizontal';
  /** The facade edge a vertical sign hangs from. */
  side: 'left' | 'right';
  /** Archived buildings keep an unlit board. */
  lit: boolean;
}

/** A repo's building, placed on the street. Coordinates are world art pixels. */
export interface PlacedBuilding extends BuildingSpec {
  /** The repo name, unique within one owner. */
  id: string;
  /** Left edge; the building stands on y = 0 and rises to y = -height. */
  x: number;
  width: number;
  height: number;
  /** Seed for visual details; depends only on owner and repo name. */
  seed: number;
  sign: Sign;
}

/** Small street furniture on the sidewalk. */
export interface Prop {
  kind: PropKind;
  x: number;
  seed: number;
}

/** Non-repo places that give the street life: konbini, food stall, shrine, empty lot. */
export interface Fixture {
  kind: FixtureKind;
  x: number;
  width: number;
  seed: number;
}

/** A side street with a crosswalk. */
export interface Span {
  x: number;
  width: number;
}

export interface CityLayout {
  seed: number;
  /** Total street length in world pixels. */
  width: number;
  /** Sorted by x. */
  buildings: PlacedBuilding[];
  fixtures: Fixture[];
  props: Prop[];
  crossings: Span[];
  /** Stretches of izakaya grouped into an alley (横丁). */
  yokocho: Span[];
  /** Highest point above the ground, rooftop details included. */
  skylineHeight: number;
}
