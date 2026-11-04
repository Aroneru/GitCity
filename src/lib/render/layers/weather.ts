import { STREET_DEPTH } from '../../city/geometry';
import { noise } from '../animation';
import { createSurface, type CanvasFactory, type Surface, type View } from '../canvas';
import type { Clock } from './effects';

/**
 * The weather layer: rain veiling the distance, falling in two depths,
 * splashing on the street, and turning the pavement into a rippling mirror
 * of the neon above.
 */

/** Rain hides the distance: dim everything behind the street. */
export function drawRainHaze(ctx: CanvasRenderingContext2D, view: View): void {
  const ground = Math.round(-view.y);
  if (ground <= 0) return;
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#141838';
  ctx.fillRect(0, 0, view.w, ground);
  ctx.globalAlpha = 1;
}

/** A scratch canvas big enough for the reflection, reused between frames. */
export function reflectionScratch(existing: Surface | null, view: View, createCanvas: CanvasFactory): Surface {
  const height = STREET_DEPTH * 2;
  if (existing && existing.canvas.width >= view.w && existing.canvas.height >= height) return existing;
  return createSurface(createCanvas, view.w, height);
}

/**
 * Wet pavement: the scene just above the ground is mirrored into the street
 * (squashed 2:1 so taller signs reach it), added on top of darkened asphalt
 * and broken into ripples that drift over time.
 */
export function drawReflections(target: Surface, scratch: Surface, view: View, clock: Clock): void {
  const ground = Math.round(-view.y);
  const depth = Math.min(STREET_DEPTH, view.h - ground);
  if (depth <= 0 || ground <= 0) return;
  const source = Math.min(ground, depth * 2);

  const mirror = scratch.ctx;
  mirror.clearRect(0, 0, scratch.canvas.width, scratch.canvas.height);
  mirror.save();
  mirror.translate(0, source);
  mirror.scale(1, -1);
  mirror.drawImage(target.canvas, 0, ground - source, view.w, source, 0, 0, view.w, source);
  mirror.restore();

  const ctx = target.ctx;
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#04061a';
  ctx.fillRect(0, ground, view.w, depth);
  ctx.globalCompositeOperation = 'lighter';
  const t = clock.animate ? clock.time : 0;
  for (let row = 0; row < depth; row++) {
    const ripple = Math.round(Math.sin(row * 0.9 + t * 3.2) * (0.6 + row * 0.04));
    ctx.globalAlpha = 0.5 * Math.pow(1 - row / depth, 0.8);
    ctx.drawImage(scratch.canvas, 0, Math.min(source - 1, row * 2), view.w, 1, ripple, ground + row, view.w, 1);
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}

const RAIN_LAYERS = [
  // Far: small, dim, slower.
  { pixelsPerDrop: 650, speed: 230, length: 3, color: '#6d7cab', alpha: 0.45, seed: 11 },
  // Near: long, bright, fast.
  { pixelsPerDrop: 2400, speed: 380, length: 6, color: '#aebbe0', alpha: 0.55, seed: 29 },
] as const;

/** Falling rain, slanted a little by the wind, and splashes on the street. */
export function drawRain(ctx: CanvasRenderingContext2D, view: View, clock: Clock): void {
  const t = clock.animate ? clock.time : 0;
  const spanX = view.w + 40;
  const spanY = view.h + 20;
  for (const layer of RAIN_LAYERS) {
    ctx.fillStyle = layer.color;
    ctx.globalAlpha = layer.alpha;
    const count = Math.round((view.w * view.h) / layer.pixelsPerDrop);
    const upper = Math.ceil(layer.length / 2);
    for (let i = 0; i < count; i++) {
      const fall = noise(layer.seed, i) * spanY + t * layer.speed;
      const x = Math.round(mod(noise(layer.seed + 1, i) * spanX - fall * 0.25, spanX) - 20);
      const y = Math.round((fall % spanY) - 10);
      ctx.fillRect(x, y, 1, upper);
      ctx.fillRect(x - 1, y + upper, 1, layer.length - upper);
    }
  }

  const ground = Math.round(-view.y);
  const depth = Math.min(STREET_DEPTH, view.h - ground);
  if (depth > 3) {
    ctx.fillStyle = '#9fb0d6';
    ctx.globalAlpha = 0.6;
    const splashes = Math.round(view.w / 10);
    for (let i = 0; i < splashes; i++) {
      const cycle = t / 0.35 + noise(5, i);
      const k = Math.floor(cycle);
      if (cycle - k > 0.45) continue;
      const x = Math.round(noise(6 + k, i) * view.w);
      const y = ground + 1 + Math.round(noise(9 + k, i) * (depth - 3));
      ctx.fillRect(x, y, 1, 1);
      ctx.fillRect(x - 1, y - 1, 1, 1);
      ctx.fillRect(x + 1, y - 1, 1, 1);
    }
  }
  ctx.globalAlpha = 1;
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}
