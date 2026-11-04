import { beaconOn, neonLevel } from './animation';
import { drawSprites, spriteVisible, type Glow, type Surface, type View } from './canvas';
import { glowOffset } from './glow';
import {
  drawActorGlows,
  drawBeacons,
  drawSigns,
  drawSteam,
  drawTrain,
  drawVehicles,
  drawWindowFlips,
  type TrainActor,
  type VehicleActor,
} from './layers/effects';
import { drawSky, moonPosition } from './layers/sky';
import { drawStrip } from './layers/strip';
import { drawStreet } from './layers/street';
import { drawRain, drawRainHaze, drawReflections } from './layers/weather';
import type { Scene } from './scene';

/**
 * One frame of the city. The live view and the PNG export both draw
 * through here, so a rainy export looks like the rainy screen.
 *
 * Pixel layers, back to front: sky (moon, stars, clouds) → distant skyline
 * → midground and railway (with the train) → [rain haze] → street →
 * buildings (windows switching, beacons blinking) → wires → signs
 * (flickering) → street furniture → steam → [wet reflections] → traffic →
 * [rain]. Then, after upscaling, the soft glows.
 */

export interface FrameState {
  /** Seconds, for animation. */
  time: number;
  /** False holds everything still: reduced motion, and exports. */
  animate: boolean;
  rain: boolean;
}

export interface Actors {
  train: TrainActor | null;
  vehicles: VehicleActor[];
}

export const NO_ACTORS: Actors = { train: null, vehicles: [] };

/** Draw the pixel layers of `view` into `target` at 1 art pixel per pixel. */
export function drawFrame(target: Surface, scene: Scene, view: View, frame: FrameState, actors: Actors = NO_ACTORS, scratch: Surface | null = null): void {
  const ctx = target.ctx;
  const clock = { time: frame.time, animate: frame.animate };
  ctx.imageSmoothingEnabled = false;

  drawSky(ctx, scene.sky, view, frame.animate ? frame.time : 0);
  drawStrip(ctx, scene.skyline, view);
  drawStrip(ctx, scene.midground, view);
  if (actors.train) drawTrain(ctx, scene.train, actors.train, view);
  if (frame.rain) drawRainHaze(ctx, view);

  drawSprites(ctx, scene.street.sideStreets, view);
  drawStreet(ctx, scene.street, view);
  drawSprites(ctx, scene.buildings, view);
  drawWindowFlips(ctx, scene.windows, view, clock);
  drawBeacons(ctx, scene.beacons, view, clock);
  // Wires pass behind the signs so they never cut through lettering.
  if (scene.wires) drawSprites(ctx, [scene.wires], view);
  drawSigns(ctx, scene, view, clock);
  drawSprites(ctx, scene.props, view);
  drawSprites(ctx, scene.poles, view);
  drawSteam(ctx, scene.steam, view, clock);

  if (frame.rain && scratch) drawReflections(target, scratch, view, clock);
  drawVehicles(ctx, scene.vehicles, actors.vehicles, view, frame.rain);
  if (frame.rain) drawRain(ctx, view, clock);
}

/**
 * Add the soft glows onto an already upscaled frame. Glow sprites are
 * low-resolution blurs drawn with smoothing on, so they stay soft while the
 * pixels stay crisp. Flickering signs and blinking beacons dim with their lights.
 */
export function drawFrameGlows(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  view: View,
  scale: number,
  frame: FrameState,
  actors: Actors = NO_ACTORS,
): void {
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.globalCompositeOperation = 'lighter';

  const moon = moonPosition(view);
  const moonPad = glowOffset(6);
  ctx.globalAlpha = frame.rain ? 0.18 : 0.35;
  ctx.drawImage(
    scene.sky.moonGlow,
    (moon.x - moonPad) * scale,
    (moon.y - moonPad) * scale,
    scene.sky.moonGlow.width * scale,
    scene.sky.moonGlow.height * scale,
  );

  for (const glow of scene.glows) {
    if (!spriteVisible(glow, view)) continue;
    const level = glowLevel(glow, frame);
    if (level <= 0) continue;
    ctx.globalAlpha = Math.min(1, glow.alpha * level);
    ctx.drawImage(glow.canvas, (glow.x - view.x) * scale, (glow.y - view.y) * scale, glow.canvas.width * scale, glow.canvas.height * scale);
  }
  drawActorGlows(ctx, scene, actors, view, scale, frame.rain);
  ctx.restore();
}

function glowLevel(glow: Glow, frame: FrameState): number {
  if (!glow.pulse || !frame.animate) return 1;
  if (glow.pulse.kind === 'beacon') return beaconOn(glow.pulse.seed, frame.time) ? 1 : 0;
  return neonLevel(glow.pulse.seed, glow.pulse.behavior, frame.time);
}
