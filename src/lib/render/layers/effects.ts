import { beaconOn, neonLevel, noise, windowFlipped } from '../animation';
import { spriteVisible, type View } from '../canvas';
import { hline, px, rect } from '../draw';
import { WINDOW } from '../palette';
import type { Scene } from '../scene';
import { BEACON, type WindowCell } from '../sprites/building';
import type { MovingSprite, VehicleArt, VehicleKind } from '../sprites/vehicles';
import { MIDGROUND_PARALLAX, RAIL_DECK_Y } from './skyline';

/**
 * The effects layer: everything that changes over time on top of the baked
 * scene. Lights flicker and blink, windows switch on and off, steam rises,
 * and the train and street traffic pass by. With `animate` off (reduced
 * motion, or a PNG export) it all holds still.
 */

export interface Clock {
  /** Seconds. */
  time: number;
  animate: boolean;
}

/** A train on the elevated railway; `x` is its left edge in the midground's own coordinates. */
export interface TrainActor {
  x: number;
  dir: 1 | -1;
}

export type Lane = 'edge' | 'far' | 'near';

/** A car or cyclist on the street; `x` is its left edge in world space. */
export interface VehicleActor {
  kind: VehicleKind;
  x: number;
  dir: 1 | -1;
  lane: Lane;
}

/**
 * Where each lane's wheels touch the road (world y). Japan drives on the
 * left, so seen from this sidewalk the far lane heads right and the near
 * lane heads left; cyclists keep to the far edge.
 */
export const LANE_BASE: Readonly<Record<Lane, number>> = { edge: 13, far: 24, near: 37 };

/** Each sign lit or dark for this instant. */
export function drawSigns(ctx: CanvasRenderingContext2D, scene: Scene, view: View, clock: Clock): void {
  scene.signs.forEach((sign, i) => {
    if (!spriteVisible(sign, view)) return;
    const { off, seed, behavior } = scene.signStates[i];
    const dark = clock.animate && off !== null && neonLevel(seed, behavior, clock.time) < 0.5;
    ctx.drawImage(dark && off ? off : sign.canvas, Math.round(sign.x - view.x), Math.round(sign.y - view.y));
  });
}

/** A few windows at a time go dark or light up, as people come and go. */
export function drawWindowFlips(ctx: CanvasRenderingContext2D, windows: readonly WindowCell[], view: View, clock: Clock): void {
  if (!clock.animate) return;
  for (const cell of windows) {
    if (cell.x + cell.w < view.x || cell.x > view.x + view.w || cell.y + cell.h < view.y || cell.y > view.y + view.h) continue;
    if (!windowFlipped(cell.seed, clock.time)) continue;
    const x = Math.round(cell.x - view.x);
    const y = Math.round(cell.y - view.y);
    if (cell.lit) {
      rect(ctx, x, y, cell.w, cell.h, WINDOW.dark);
      px(ctx, x + cell.w - 1, y, WINDOW.darkHi);
    } else {
      rect(ctx, x, y, cell.w, cell.h, WINDOW.warm);
      hline(ctx, x, y, cell.w, WINDOW.warmHi);
    }
  }
}

/** Rooftop beacons blink red. */
export function drawBeacons(
  ctx: CanvasRenderingContext2D,
  beacons: ReadonlyArray<{ x: number; y: number; seed: number }>,
  view: View,
  clock: Clock,
): void {
  if (!clock.animate) return;
  for (const beacon of beacons) {
    if (!beaconOn(beacon.seed, clock.time)) {
      rect(ctx, Math.round(beacon.x - view.x), Math.round(beacon.y - view.y), BEACON.w, BEACON.h, BEACON.off);
    }
  }
}

/** Puffs of steam rising from the food stall's pot. */
export function drawSteam(ctx: CanvasRenderingContext2D, sources: ReadonlyArray<{ x: number; y: number }>, view: View, clock: Clock): void {
  const t = clock.animate ? clock.time : 0;
  ctx.fillStyle = '#e6e9f8';
  sources.forEach((source, s) => {
    for (let i = 0; i < 6; i++) {
      const p = (t * 0.38 + i / 6 + noise(s + 1, i) * 0.1) % 1;
      const size = 2 + Math.floor(p * 3);
      ctx.globalAlpha = 0.6 * (1 - p);
      ctx.fillRect(
        Math.round(source.x - view.x + Math.sin(p * 5 + i) * 1.5 + p * 4),
        Math.round(source.y - view.y - p * 22),
        size,
        size,
      );
    }
  });
  ctx.globalAlpha = 1;
}

export function trainScreenX(train: TrainActor, view: View): number {
  return Math.round(train.x - Math.round(view.x * MIDGROUND_PARALLAX));
}

/** The train rides on the viaduct deck, in the midground's parallax. */
export function drawTrain(ctx: CanvasRenderingContext2D, art: MovingSprite, train: TrainActor, view: View): void {
  ctx.drawImage(train.dir === 1 ? art.right : art.left, trainScreenX(train, view), Math.round(RAIL_DECK_Y - art.h - view.y));
}

export function vehicleSprite(art: VehicleArt, kind: VehicleKind, rain: boolean): MovingSprite {
  return kind === 'cyclist' && rain ? art.cyclistUmbrella : art[kind];
}

/** Traffic, back lanes first so nearer vehicles pass in front. */
export function drawVehicles(ctx: CanvasRenderingContext2D, art: VehicleArt, vehicles: readonly VehicleActor[], view: View, rain: boolean): void {
  for (const lane of ['edge', 'far', 'near'] as const) {
    for (const vehicle of vehicles) {
      if (vehicle.lane !== lane) continue;
      const sprite = vehicleSprite(art, vehicle.kind, rain);
      ctx.drawImage(
        vehicle.dir === 1 ? sprite.right : sprite.left,
        Math.round(vehicle.x - view.x),
        Math.round(LANE_BASE[lane] - sprite.h - view.y),
      );
    }
  }
}

/** Light from the train's windows and the traffic's headlights, after the upscale. */
export function drawActorGlows(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  actors: { train: TrainActor | null; vehicles: readonly VehicleActor[] },
  view: View,
  scale: number,
  rain: boolean,
): void {
  const glowAt = (sprite: MovingSprite, dir: 1 | -1, x: number, y: number, alpha: number) => {
    const glow = dir === 1 ? sprite.glowRight : sprite.glowLeft;
    const at = dir === 1 ? sprite.glowAt.right : sprite.glowAt.left;
    ctx.globalAlpha = alpha;
    ctx.drawImage(glow, (x + at.x) * scale, (y + at.y) * scale, glow.width * scale, glow.height * scale);
  };
  if (actors.train) {
    glowAt(scene.train, actors.train.dir, trainScreenX(actors.train, view), Math.round(RAIL_DECK_Y - scene.train.h - view.y), 0.6);
  }
  for (const vehicle of actors.vehicles) {
    const sprite = vehicleSprite(scene.vehicles, vehicle.kind, rain);
    glowAt(sprite, vehicle.dir, Math.round(vehicle.x - view.x), Math.round(LANE_BASE[vehicle.lane] - sprite.h - view.y), 0.75);
  }
}
