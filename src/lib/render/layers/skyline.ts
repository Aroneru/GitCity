import type { Rng } from '../../city/seed';
import { createSurface, type CanvasFactory } from '../canvas';
import { dither, hline, px, rect, vline } from '../draw';
import { MIDGROUND, SKYLINE } from '../palette';
import type { Strip } from './strip';

/**
 * Background layers behind the street: the distant skyline silhouette
 * (parallax 0.35) and the midground blocks with the elevated railway
 * (parallax 0.7). Both are seeded tiles that repeat seamlessly.
 */

const SKYLINE_TILE = { w: 1024, h: 150 };
const MIDGROUND_TILE = { w: 1536, h: 210 };
/** World y of the railway deck's top. */
export const RAIL_DECK_Y = -92;
export const MIDGROUND_PARALLAX = 0.7;

export function buildSkyline(rng: Rng, createCanvas: CanvasFactory): Strip {
  const { w, h } = SKYLINE_TILE;
  const { canvas, ctx } = createSurface(createCanvas, w, h);

  let x = 0;
  while (x < w) {
    const width = rng.int(14, 46);
    const height = rng.chance(0.08) ? rng.int(110, 140) : rng.int(24, 100);
    const bw = Math.min(width, w - x);
    const top = h - height;
    rect(ctx, x, top, bw, height, SKYLINE.body);
    hline(ctx, x, top, bw, SKYLINE.rim);
    // Sparse distant windows.
    for (let wy = top + 3; wy < h - 6; wy += 4) {
      for (let wx = x + 2; wx < x + bw - 2; wx += 3) {
        if (rng.chance(0.06)) px(ctx, wx, wy, rng.pick(SKYLINE.window));
      }
    }
    // An occasional mast with an aviation light.
    if (height > 70 && rng.chance(0.35)) {
      const mx = x + Math.floor(bw / 2);
      const mast = rng.int(6, 14);
      vline(ctx, mx, top - mast, mast, SKYLINE.rim);
      px(ctx, mx, top - mast - 1, SKYLINE.aviation);
    }
    x += width + rng.int(0, 3);
  }
  // Haze where the skyline meets the horizon glow.
  for (let i = 0; i < 4; i++) dither(ctx, 0, h - 40 + i * 10, w, 10, SKYLINE.haze, 0.12 + i * 0.12);

  return { canvas, top: -h, parallax: 0.35 };
}

export function buildMidground(rng: Rng, createCanvas: CanvasFactory): Strip {
  const { w, h } = MIDGROUND_TILE;
  const { canvas, ctx } = createSurface(createCanvas, w, h);
  const deck = h + RAIL_DECK_Y;

  // Blocks behind the railway.
  let x = 0;
  while (x < w) {
    const width = rng.int(20, 60);
    const height = rng.chance(0.15) ? rng.int(130, 180) : rng.int(40, 125);
    const bw = Math.min(width, w - x);
    const top = h - height;
    const body = rng.chance(0.5) ? MIDGROUND.body : MIDGROUND.bodyAlt;
    rect(ctx, x, top, bw, height, body);
    hline(ctx, x, top, bw, MIDGROUND.rim);
    for (let wy = top + 4; wy < h - 4; wy += 5) {
      const floorLit = rng.chance(0.25);
      for (let wx = x + 3; wx < x + bw - 3; wx += 4) {
        if (rng.chance(floorLit ? 0.45 : 0.06)) rect(ctx, wx, wy, 2, 2, rng.pick(MIDGROUND.window));
      }
    }
    if (rng.chance(0.3)) rect(ctx, x + rng.int(2, Math.max(2, bw - 8)), top - 5, 6, 5, MIDGROUND.rim);
    if (height > 70 && rng.chance(0.25)) {
      const sx = rng.chance(0.5) ? x + 1 : x + bw - 3;
      rect(ctx, sx, top + rng.int(8, 20), 2, rng.int(10, 18), rng.pick(MIDGROUND.sign));
    }
    x += width + rng.int(0, 2);
  }

  // Haze over the blocks' lower floors.
  for (let i = 0; i < 4; i++) dither(ctx, 0, h - 60 + i * 15, w, 15, MIDGROUND.haze, 0.1 + i * 0.12);

  // Elevated railway: pillars, deck, parapet and catenary.
  const rail = MIDGROUND.rail;
  for (let px0 = 24; px0 < w; px0 += 96) {
    rect(ctx, px0, deck + 8, 8, h - deck - 8, rail.pillar);
    vline(ctx, px0, deck + 8, h - deck - 8, rail.pillarLit);
    rect(ctx, px0 - 3, deck + 8, 14, 2, rail.deckShade);
  }
  rect(ctx, 0, deck, w, 8, rail.deck);
  hline(ctx, 0, deck, w, rail.deckTop);
  hline(ctx, 0, deck + 7, w, rail.deckShade);
  for (let i = 0; i < w; i += 8) vline(ctx, i, deck + 2, 4, rail.deckShade);
  hline(ctx, 0, deck - 3, w, rail.mast);
  for (let i = 0; i < w; i += 6) vline(ctx, i, deck - 3, 3, rail.mast);
  for (let mx = 0; mx < w; mx += 48) {
    vline(ctx, mx, deck - 18, 15, rail.mast);
    hline(ctx, mx - 3, deck - 16, 7, rail.mast);
  }
  hline(ctx, 0, deck - 14, w, rail.wire);

  return { canvas, top: -h, parallax: MIDGROUND_PARALLAX };
}
