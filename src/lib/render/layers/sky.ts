import type { Rng } from '../../city/seed';
import { createSurface, type CanvasFactory, type View } from '../canvas';
import { bayer, dither, disc, hline, px, rect } from '../draw';
import { hexToRgb, makeGlow } from '../glow';
import { SKY, SKY_STOPS } from '../palette';

/**
 * The sky layer: a dithered night gradient, stars, a moon with a halo, and
 * thin drifting clouds. Horizontally the sky is fixed to the screen
 * (parallax 0) and the clouds drift at parallax 0.1; vertically it is tied
 * to the world so the horizon glow always sits behind the skyline.
 */

const GRADIENT_TILE = 64;
const STAR_TILE = { w: 256, h: 280, top: -420 };
const CLOUD_TILE = { w: 640, h: 120, top: -300 };
const MOON_SIZE = 44;
const MOON_RADIUS = 11;
export const CLOUD_PARALLAX = 0.1;

export interface SkyArt {
  gradient: HTMLCanvasElement;
  gradientTop: number;
  stars: HTMLCanvasElement;
  clouds: HTMLCanvasElement;
  moon: HTMLCanvasElement;
  moonGlow: HTMLCanvasElement;
}

export function buildSky(rng: Rng, createCanvas: CanvasFactory): SkyArt {
  return {
    gradient: buildGradient(createCanvas),
    gradientTop: SKY_STOPS[0][0],
    stars: buildStars(rng.fork('stars'), createCanvas),
    clouds: buildClouds(rng.fork('clouds'), createCanvas),
    moon: buildMoon(createCanvas),
    moonGlow: buildMoonGlow(createCanvas),
  };
}

/** Where the moon sits on screen: fixed to the view, upper right. */
export function moonPosition(view: View): { x: number; y: number } {
  return { x: Math.round(view.w * 0.76) - MOON_SIZE / 2, y: Math.min(28, Math.round(view.h * 0.08)) };
}

export function drawSky(ctx: CanvasRenderingContext2D, sky: SkyArt, view: View, time = 0): void {
  rect(ctx, 0, 0, view.w, view.h, SKY.zenith);

  const gradientY = Math.round(sky.gradientTop - view.y);
  for (let x = 0; x < view.w; x += GRADIENT_TILE) ctx.drawImage(sky.gradient, x, gradientY);

  const starsY = Math.round(STAR_TILE.top - view.y);
  for (let x = 0; x < view.w; x += STAR_TILE.w) ctx.drawImage(sky.stars, x, starsY);

  const moon = moonPosition(view);
  ctx.drawImage(sky.moon, moon.x, moon.y);

  const drift = time * 1.5;
  const offset = mod(Math.round(view.x * CLOUD_PARALLAX + drift), CLOUD_TILE.w);
  const cloudsY = Math.round(CLOUD_TILE.top - view.y);
  for (let x = -offset; x < view.w; x += CLOUD_TILE.w) ctx.drawImage(sky.clouds, x, cloudsY);
}

function buildGradient(createCanvas: CanvasFactory): HTMLCanvasElement {
  const top = SKY_STOPS[0][0];
  const height = -top;
  const { canvas, ctx } = createSurface(createCanvas, GRADIENT_TILE, height);
  const image = ctx.createImageData(GRADIENT_TILE, height);
  const stops = SKY_STOPS.map(([y, color]) => [y, hexToRgb(color)] as const);

  for (let row = 0; row < height; row++) {
    const worldY = top + row;
    let i = 0;
    while (i < stops.length - 2 && worldY >= stops[i + 1][0]) i++;
    const [y0, c0] = stops[i];
    const [y1, c1] = stops[i + 1];
    const t = Math.min(1, Math.max(0, (worldY - y0) / (y1 - y0)));
    for (let x = 0; x < GRADIENT_TILE; x++) {
      const [r, g, b] = bayer(x, row) < t ? c1 : c0;
      const k = (row * GRADIENT_TILE + x) * 4;
      image.data[k] = r;
      image.data[k + 1] = g;
      image.data[k + 2] = b;
      image.data[k + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

function buildStars(rng: Rng, createCanvas: CanvasFactory): HTMLCanvasElement {
  const { canvas, ctx } = createSurface(createCanvas, STAR_TILE.w, STAR_TILE.h);
  for (let i = 0; i < 70; i++) {
    const x = rng.int(0, STAR_TILE.w - 1);
    // Denser toward the zenith, fading out toward the horizon haze.
    const y = Math.floor(rng.next() ** 1.6 * STAR_TILE.h);
    const roll = rng.next();
    if (roll < 0.06 && x > 1 && x < STAR_TILE.w - 2 && y > 1 && y < STAR_TILE.h - 2) {
      px(ctx, x, y, SKY.starBright);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) px(ctx, x + dx, y + dy, SKY.starDim);
    } else {
      px(ctx, x, y, roll < 0.35 ? SKY.star : SKY.starDim);
    }
  }
  return canvas;
}

function buildClouds(rng: Rng, createCanvas: CanvasFactory): HTMLCanvasElement {
  const { canvas, ctx } = createSurface(createCanvas, CLOUD_TILE.w, CLOUD_TILE.h);
  const wisps = rng.int(5, 7);
  for (let i = 0; i < wisps; i++) {
    const cx = rng.int(0, CLOUD_TILE.w - 1);
    const cy = rng.int(12, CLOUD_TILE.h - 16);
    const length = rng.int(50, 150);
    const strips = rng.int(2, 3);
    for (let s = 0; s < strips; s++) {
      const stripLength = Math.round(length * rng.float(0.45, 1));
      const sx = cx + Math.round(length * rng.float(-0.3, 0.3)) - Math.round(stripLength / 2);
      const sy = cy + s * 2;
      const thickness = s === strips - 1 ? 1 : 2;
      // Draw into the tile three times so wisps wrap seamlessly.
      for (const wrap of [-CLOUD_TILE.w, 0, CLOUD_TILE.w]) {
        const x = sx + wrap;
        rect(ctx, x + 4, sy, stripLength - 8, thickness, SKY.cloud);
        dither(ctx, x, sy, 4, thickness, SKY.cloudEdge, 0.5);
        dither(ctx, x + stripLength - 4, sy, 4, thickness, SKY.cloudEdge, 0.5);
        if (s === 0) hline(ctx, x + 10, sy, Math.max(0, stripLength - 26), SKY.cloudLit);
      }
    }
  }
  return canvas;
}

function buildMoon(createCanvas: CanvasFactory): HTMLCanvasElement {
  const { canvas, ctx } = createSurface(createCanvas, MOON_SIZE, MOON_SIZE);
  const c = MOON_SIZE / 2;
  // Dithered halo rings.
  for (let y = 0; y < MOON_SIZE; y++) {
    for (let x = 0; x < MOON_SIZE; x++) {
      const d = Math.hypot(x + 0.5 - c, y + 0.5 - c);
      if (d > MOON_RADIUS && d <= MOON_RADIUS + 4 && bayer(x, y) < 0.5) px(ctx, x, y, SKY.moonHaloInner);
      else if (d > MOON_RADIUS + 4 && d <= MOON_RADIUS + 9 && bayer(x, y) < 0.22) px(ctx, x, y, SKY.moonHaloOuter);
    }
  }
  disc(ctx, c, c, MOON_RADIUS, SKY.moon);
  // A soft terminator on the left edge and a few craters.
  for (let y = -MOON_RADIUS; y <= MOON_RADIUS; y++) {
    for (let x = -MOON_RADIUS; x <= MOON_RADIUS; x++) {
      const d = Math.hypot(x, y);
      if (d > MOON_RADIUS - 0.2) continue;
      const shade = (x + MOON_RADIUS) / (MOON_RADIUS * 2);
      if (shade < 0.22 && bayer(x, y) < 0.7) px(ctx, c + x, c + y, SKY.moonShade);
    }
  }
  for (const [x, y, r] of [[3, -3, 2], [-2, 4, 1], [5, 4, 1], [-4, -5, 1]]) disc(ctx, c + x, c + y, r, SKY.moonCrater);
  return canvas;
}

function buildMoonGlow(createCanvas: CanvasFactory): HTMLCanvasElement {
  const { canvas, ctx } = createSurface(createCanvas, MOON_SIZE, MOON_SIZE);
  disc(ctx, MOON_SIZE / 2, MOON_SIZE / 2, MOON_RADIUS + 2, '#ffffff');
  return makeGlow(canvas, SKY.moonGlow, 6, createCanvas);
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}
