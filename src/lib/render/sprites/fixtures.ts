import { createRng } from '../../city/seed';
import { LOT_SIGN } from '../../city/signs';
import type { Fixture } from '../../city/types';
import { createSurface, type CanvasFactory, type Glow, type Sprite } from '../canvas';
import { bayer, disc, dither, hline, px, rect, vline } from '../draw';
import { drawBitmap, textBitmap, type GlyphAtlas } from '../glyphs';
import { rectGlow } from '../glow';
import type { LightPool } from '../layers/street';
import { KONBINI, NOREN, PROPS, SHRINE, SIGN_BOARD, WINDOW, WOOD } from '../palette';
import { drawLantern, lanternGlow } from './izakaya';

/**
 * Places on the street that aren't repos: a convenience store, a food stall,
 * a tiny shrine with a torii, and an empty lot for cities with no repos.
 */

export interface FixtureArt {
  sprite: Sprite;
  glows: Glow[];
  pools: LightPool[];
  /** Where steam rises, in world space (the food stall's pot). */
  steam: Array<{ x: number; y: number }>;
}

const HEIGHT = { konbini: 32, yatai: 34, shrine: 46, lot: 30 } as const;

export function drawFixture(fixture: Fixture, atlas: GlyphAtlas, createCanvas: CanvasFactory): FixtureArt {
  const h = HEIGHT[fixture.kind];
  const { canvas, ctx } = createSurface(createCanvas, fixture.width, h);
  const sprite = { canvas, x: fixture.x, y: -h };
  const at = (x: number, y: number) => ({ x: sprite.x + x, y: sprite.y + y });
  const glows: Glow[] = [];
  const pools: LightPool[] = [];
  const steam: FixtureArt['steam'] = [];
  const w = fixture.width;
  const rng = createRng(fixture.seed);

  switch (fixture.kind) {
    case 'konbini': {
      rect(ctx, 0, 0, w, h, KONBINI.wall);
      hline(ctx, 0, 0, w, KONBINI.interiorHi);
      vline(ctx, w - 1, 0, h, KONBINI.wallShade);
      // Fascia stripes.
      rect(ctx, 0, 3, w, 2, KONBINI.stripeA);
      rect(ctx, 0, 6, w, 2, KONBINI.stripeB);
      rect(ctx, 0, 9, w, 1, KONBINI.stripeA);
      // Bright glass front with shelves of goods.
      const gy = 11;
      rect(ctx, 2, gy, w - 4, h - gy - 1, KONBINI.frame);
      rect(ctx, 3, gy + 1, w - 6, h - gy - 2, KONBINI.interior);
      hline(ctx, 3, gy + 1, w - 6, KONBINI.interiorHi);
      for (let sy = gy + 5; sy < h - 2; sy += 5) {
        hline(ctx, 3, sy, w - 16, KONBINI.shelf);
        for (let sx = 4; sx < w - 14; sx += 2) if (rng.chance(0.7)) px(ctx, sx, sy - 1, rng.pick(KONBINI.items));
      }
      // Automatic door.
      rect(ctx, w - 13, gy + 1, 1, h - gy - 2, KONBINI.frame);
      vline(ctx, w - 8, gy + 1, h - gy - 2, KONBINI.frame);
      hline(ctx, 0, h - 1, w, KONBINI.wallShade);
      glows.push(rectGlow(at(3, gy + 1), w - 6, h - gy - 2, KONBINI.glow, 4, 0.28, createCanvas));
      pools.push({ x: fixture.x + w / 2, radius: w * 0.65, tone: 'cool', strength: 1 });
      break;
    }
    case 'yatai': {
      // Cloth canopy on posts over a wooden cart.
      for (let x = 0; x < w; x++) rect(ctx, x, 0, 1, 4, Math.floor(x / 3) % 2 === 0 ? '#a82a2a' : '#e8dcc8');
      for (let x = 1; x < w; x += 3) px(ctx, x, 4, '#a82a2a');
      vline(ctx, 2, 4, h - 16, WOOD.dark);
      vline(ctx, w - 3, 4, h - 16, WOOD.dark);
      const { cloth, hi } = NOREN[1];
      for (let x = 4; x < w - 4; x += 8) {
        rect(ctx, x, 5, 7, 5, cloth);
        hline(ctx, x, 5, 7, hi);
      }
      // Warm light under the canopy, a pot, and the counter.
      rect(ctx, 3, 10, w - 6, h - 22, '#ffcf8a');
      hline(ctx, 3, 10, w - 6, '#ffe6b8');
      rect(ctx, Math.floor(w / 2) - 4, 15, 8, 5, '#3a3d50');
      hline(ctx, Math.floor(w / 2) - 4, 15, 8, '#5a5e74');
      // The pot's steam escapes over the canopy, where it shows against the sky.
      steam.push(at(Math.floor(w / 2) - 2, 0));
      rect(ctx, 0, h - 13, w, 2, WOOD.light);
      rect(ctx, 1, h - 11, w - 2, 9, WOOD.base);
      for (let x = 3; x < w - 2; x += 4) vline(ctx, x, h - 11, 9, WOOD.shade);
      for (const cx of [10, w - 11]) {
        disc(ctx, cx, h - 3, 3, WOOD.dark);
        px(ctx, cx, h - 3, WOOD.trim);
      }
      drawLantern(ctx, 0, 5, true);
      drawLantern(ctx, w - 6, 5, true);
      glows.push(lanternGlow(at(0, 5), createCanvas), lanternGlow(at(w - 6, 5), createCanvas));
      glows.push(rectGlow(at(3, 10), w - 6, h - 22, WINDOW.warm, 4, 0.4, createCanvas));
      pools.push({ x: fixture.x + w / 2, radius: w * 0.6, tone: 'warm', strength: 0.9 });
      break;
    }
    case 'shrine': {
      // Trees behind, a small wooden shrine, stone lanterns and a torii in front.
      for (const [cx, cy, r] of [[24, 16, 15], [11, 22, 10], [37, 20, 11]] as const) {
        disc(ctx, cx, cy, r, SHRINE.tree);
        for (let y = cy - r; y <= cy + r; y++) {
          for (let x = cx - r; x <= cx + r; x++) {
            const d = Math.hypot(x - cx + 3, y - cy + 4);
            if (d < r - 2 && bayer(x, y) < 0.35) px(ctx, x, y, d < r * 0.5 ? SHRINE.treeHi : SHRINE.treeMid);
          }
        }
      }
      rect(ctx, 18, h - 16, 12, 16, SHRINE.shrineWood);
      rect(ctx, 16, h - 20, 16, 4, SHRINE.shrineRoof);
      hline(ctx, 15, h - 17, 18, SHRINE.shrineRoof);
      rect(ctx, 22, h - 12, 4, 5, SHRINE.light);
      for (const sx of [3, w - 7]) {
        rect(ctx, sx, h - 2, 4, 2, SHRINE.stoneShade);
        rect(ctx, sx + 1, h - 6, 2, 4, SHRINE.stone);
        rect(ctx, sx, h - 9, 4, 3, SHRINE.stone);
        px(ctx, sx + 1, h - 8, SHRINE.light);
        px(ctx, sx + 2, h - 8, SHRINE.light);
        hline(ctx, sx - 1, h - 10, 6, SHRINE.stoneHi);
        glows.push(rectGlow(at(sx + 1, h - 8), 2, 1, SHRINE.light, 2, 0.6, createCanvas));
      }
      const left = 12;
      const right = w - 14;
      const toriiTop = h - 28;
      rect(ctx, left, toriiTop + 2, 2, 26, SHRINE.torii);
      rect(ctx, right, toriiTop + 2, 2, 26, SHRINE.torii);
      vline(ctx, left + 1, toriiTop + 2, 26, SHRINE.toriiShade);
      vline(ctx, right + 1, toriiTop + 2, 26, SHRINE.toriiShade);
      hline(ctx, left - 4, toriiTop, right - left + 10, SHRINE.kasagi);
      hline(ctx, left - 3, toriiTop + 1, right - left + 8, SHRINE.torii);
      px(ctx, left - 5, toriiTop - 1, SHRINE.kasagi);
      px(ctx, right + 5, toriiTop - 1, SHRINE.kasagi);
      hline(ctx, left - 1, toriiTop + 6, right - left + 4, SHRINE.torii);
      hline(ctx, left - 1, toriiTop + 7, right - left + 4, SHRINE.toriiShade);
      rect(ctx, Math.floor((left + right) / 2), toriiTop + 2, 2, 4, SHRINE.kasagi);
      glows.push(rectGlow(at(22, h - 12), 4, 5, SHRINE.light, 3, 0.4, createCanvas));
      break;
    }
    case 'lot': {
      // A chain-link fence around weeds, with a "land for sale" board.
      for (let y = 12; y < h - 1; y++) {
        for (let x = 0; x < w; x++) if ((x + y) % 3 === 0 || (x - y + 300) % 3 === 0) px(ctx, x, y, '#363a58');
      }
      for (let x = 0; x < w; x += 12) rect(ctx, x, 10, 2, h - 10, PROPS.pole);
      hline(ctx, 0, 12, w, PROPS.pole);
      dither(ctx, 0, h - 5, w, 5, PROPS.leaf, 0.5);
      dither(ctx, 0, h - 3, w, 3, PROPS.leafHi, 0.3);
      const text = textBitmap(atlas, LOT_SIGN, false);
      const bw = text.w + 6;
      const bx = 20;
      rect(ctx, bx + 3, 20, 2, h - 20, WOOD.dark);
      rect(ctx, bx + bw - 5, 20, 2, h - 20, WOOD.dark);
      rect(ctx, bx, 0, bw, text.h + 6, SIGN_BOARD.frame);
      rect(ctx, bx + 1, 1, bw - 2, text.h + 4, SIGN_BOARD.paper);
      drawBitmap(ctx, text, bx + 3, 3, SIGN_BOARD.paperText);
      break;
    }
  }
  return { sprite, glows, pools, steam };
}
