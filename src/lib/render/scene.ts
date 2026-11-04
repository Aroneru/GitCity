import { createRng } from '../city/seed';
import type { CityLayout } from '../city/types';
import type { SignBehavior } from './animation';
import type { CanvasFactory, Glow, Sprite } from './canvas';
import type { GlyphAtlas } from './glyphs';
import type { Rect } from './hit-test';
import { buildSky, type SkyArt } from './layers/sky';
import { buildMidground, buildSkyline } from './layers/skyline';
import type { Strip } from './layers/strip';
import { buildStreet, type LightPool, type StreetArt } from './layers/street';
import { drawBuilding, type WindowCell } from './sprites/building';
import { drawFixture } from './sprites/fixtures';
import { drawIzakaya } from './sprites/izakaya';
import { drawProp, drawWires } from './sprites/props';
import { drawSign } from './sprites/sign';
import { buildTrain, buildVehicles, type MovingSprite, type VehicleArt } from './sprites/vehicles';

/**
 * A city ready to draw: every static piece is baked once into cached
 * sprites, so drawing a frame is a series of blits plus a few animated
 * touches (see frame.ts for the layer order).
 */
export interface Scene {
  layout: CityLayout;
  sky: SkyArt;
  skyline: Strip;
  midground: Strip;
  street: StreetArt;
  buildings: Sprite[];
  /** One per building: `signs[i]` hangs on `layout.buildings[i]`, lights on. */
  signs: Sprite[];
  /** How each sign flickers, and what it looks like dark. */
  signStates: Array<{ off: HTMLCanvasElement | null; seed: number; behavior: SignBehavior }>;
  props: Sprite[];
  poles: Sprite[];
  wires: Sprite | null;
  glows: Glow[];
  windows: WindowCell[];
  beacons: Array<{ x: number; y: number; seed: number }>;
  steam: Array<{ x: number; y: number }>;
  train: MovingSprite;
  vehicles: VehicleArt;
}

export interface SceneDeps {
  atlas: GlyphAtlas;
  createCanvas: CanvasFactory;
}

export function buildScene(layout: CityLayout, { atlas, createCanvas }: SceneDeps): Scene {
  const rng = createRng(layout.seed).fork('scene');
  const buildings: Sprite[] = [];
  const signs: Sprite[] = [];
  const signStates: Scene['signStates'] = [];
  const props: Sprite[] = [];
  const poles: Sprite[] = [];
  const glows: Glow[] = [];
  const pools: LightPool[] = [];
  const windows: WindowCell[] = [];
  const beacons: Scene['beacons'] = [];
  const steam: Scene['steam'] = [];

  for (const fixture of layout.fixtures) {
    const art = drawFixture(fixture, atlas, createCanvas);
    buildings.push(art.sprite);
    glows.push(...art.glows);
    pools.push(...art.pools);
    steam.push(...art.steam);
  }
  for (const building of layout.buildings) {
    if (building.kind === 'izakaya') {
      const art = drawIzakaya(building, createCanvas);
      buildings.push(art.sprite);
      glows.push(...art.glows);
      pools.push(...art.pools);
    } else {
      const art = drawBuilding(building, createCanvas);
      buildings.push(art.sprite);
      glows.push(...art.glows);
      pools.push(...art.pools);
      windows.push(...art.windows);
      if (art.beacon) beacons.push(art.beacon);
    }
    const sign = drawSign(building, atlas, createCanvas);
    signs.push(sign.sprite);
    signStates.push({ off: sign.off, seed: sign.seed, behavior: sign.behavior });
    glows.push(...sign.glows);
  }
  for (const prop of layout.props) {
    const art = drawProp(prop, createCanvas);
    (prop.kind === 'pole' || prop.kind === 'trafficLight' ? poles : props).push(art.sprite);
    glows.push(...art.glows);
    pools.push(...art.pools);
  }

  return {
    layout,
    sky: buildSky(rng.fork('sky'), createCanvas),
    skyline: buildSkyline(rng.fork('skyline'), createCanvas),
    midground: buildMidground(rng.fork('midground'), createCanvas),
    street: buildStreet(layout, pools, createCanvas),
    buildings,
    signs,
    signStates,
    props,
    poles,
    wires: drawWires(
      layout.props.filter((prop) => prop.kind === 'pole'),
      layout.width,
      createCanvas,
    ),
    glows,
    windows,
    beacons,
    steam,
    train: buildTrain(rng.fork('train'), createCanvas),
    vehicles: buildVehicles(createCanvas),
  };
}

/** Sign outlines in world space, for hit testing; index i belongs to building i. */
export function signRects(scene: Scene): Rect[] {
  return scene.signs.map((sign) => ({ x: sign.x, y: sign.y, w: sign.canvas.width, h: sign.canvas.height }));
}
