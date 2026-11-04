import { GLYPH } from '../city/geometry';
import { getContext, type CanvasFactory } from './canvas';

/**
 * Japanese sign text from the DotGothic16 webfont, as exact 1-bit dot matrices.
 *
 * DotGothic16's glyphs are built from square dots on a fixed grid (pitch
 * ~61.85 units per 1000-unit em, each dot slightly oversized so neighbours
 * overlap). Rasterizing it small depends on each renderer's hinting, so
 * instead every glyph is drawn large and sampled at the centre of each dot
 * cell. Some glyphs are centred by half a dot, so each glyph picks the grid
 * phase whose cells read most unambiguously. The result is identical in
 * every browser.
 */

/** A text run as a 1-bit bitmap: `bits[y * w + x] === 1` is ink. */
export interface Bitmap {
  w: number;
  h: number;
  bits: Uint8Array;
}

interface GlyphMask {
  /** Advance: 16 for full-width glyphs, 8 for half-width. */
  advance: number;
  /** GLYPH × GLYPH, row-major. */
  bits: Uint8Array;
}

export interface GlyphAtlas {
  glyph(char: string, vertical: boolean): GlyphMask;
}

/** DotGothic16's dot pitch in font units (1000 per em), measured from its outlines. */
const DOT_PITCH = 61.85;
const UNITS_PER_EM = 1000;
/** Left edge of the first dot column, in font units from the glyph origin. */
const GRID_LEFT = 31;
/** Bottom edge of the lowest dot row, in font units from the baseline. */
const GRID_BOTTOM = -89;
/** Rendered pixels per dot when sampling. */
const SUPERSAMPLE = 8;
const FONT_PX = (UNITS_PER_EM / DOT_PITCH) * SUPERSAMPLE;
const UNIT_PX = FONT_PX / UNITS_PER_EM;
const MARGIN = 16;
const CANVAS_W = Math.ceil(UNITS_PER_EM * UNIT_PX) + MARGIN * 2;
const BASELINE = MARGIN + Math.ceil(900 * UNIT_PX);
const CANVAS_H = BASELINE + Math.ceil(200 * UNIT_PX) + MARGIN;
const PHASES: ReadonlyArray<readonly [number, number]> = [[0, 0], [0.5, 0], [0, 0.5], [0.5, 0.5]];
/** Rotated 90° in vertical text, as in real vertical signage. */
const ROTATED_IN_VERTICAL = new Set('ー－〜～—');
/** Small kana move to the top-right of the cell in vertical text. */
const SMALL_KANA = new Set('ァィゥェォッャュョヮヵヶぁぃぅぇぉっゃゅょゎ');

export function createGlyphAtlas(fontFamily: string, createCanvas: CanvasFactory): GlyphAtlas {
  const canvas = createCanvas(CANVAS_W, CANVAS_H);
  // Every glyph is read back for sampling.
  const ctx = getContext(canvas, { willReadFrequently: true });
  ctx.font = `${FONT_PX.toFixed(2)}px ${fontFamily}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';
  const cache = new Map<string, GlyphMask>();

  const rasterize = (char: string): GlyphMask => {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillText(char, MARGIN, BASELINE);
    const alpha = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H).data;
    const ink = (ux: number, uy: number) => {
      const x = Math.round(MARGIN + ux * UNIT_PX);
      const y = Math.round(BASELINE - uy * UNIT_PX);
      return x >= 0 && y >= 0 && x < CANVAS_W && y < CANVAS_H && alpha[(y * CANVAS_W + x) * 4 + 3] >= 128;
    };
    const advance = ctx.measureText(char).width > FONT_PX * 0.75 ? GLYPH : GLYPH / 2;
    const probe = DOT_PITCH * 0.3;

    let best: Uint8Array | null = null;
    let bestAmbiguity = Infinity;
    for (const [phaseX, phaseY] of PHASES) {
      const bits = new Uint8Array(GLYPH * GLYPH);
      let ambiguity = 0;
      for (let row = 0; row < GLYPH; row++) {
        // Row 0 is the top dot row (14 rows above the lowest one).
        const cy = GRID_BOTTOM + (14 - row + phaseY) * DOT_PITCH + DOT_PITCH / 2;
        for (let col = 0; col < advance; col++) {
          const cx = GRID_LEFT + (col + phaseX) * DOT_PITCH + DOT_PITCH / 2;
          const on = ink(cx, cy);
          bits[row * GLYPH + col] = on ? 1 : 0;
          // On the right grid, points around a dot's centre agree with it.
          for (const [dx, dy] of [[-probe, 0], [probe, 0], [0, -probe], [0, probe]]) {
            if (ink(cx + dx, cy + dy) !== on) ambiguity++;
          }
        }
      }
      if (ambiguity < bestAmbiguity) {
        bestAmbiguity = ambiguity;
        best = bits;
      }
    }
    return { advance, bits: best ?? new Uint8Array(GLYPH * GLYPH) };
  };

  return {
    glyph(char, vertical) {
      const key = `${vertical ? 'v' : 'h'}${char}`;
      const cached = cache.get(key);
      if (cached) return cached;
      let mask = cache.get(`h${char}`) ?? rasterize(char);
      cache.set(`h${char}`, mask);
      if (vertical) {
        if (ROTATED_IN_VERTICAL.has(char)) mask = { advance: GLYPH, bits: rotateClockwise(mask.bits) };
        else if (SMALL_KANA.has(char)) mask = { advance: GLYPH, bits: toTopRight(mask.bits) };
      }
      cache.set(key, mask);
      return mask;
    },
  };
}

/** Lay out a run of text as one bitmap, horizontally or top-to-bottom. */
export function textBitmap(atlas: GlyphAtlas, text: string, vertical: boolean): Bitmap {
  const glyphs = [...text].map((char) => atlas.glyph(char, vertical));
  const w = vertical ? GLYPH : glyphs.reduce((sum, g) => sum + g.advance, 0);
  const h = vertical ? glyphs.length * GLYPH : GLYPH;
  const bits = new Uint8Array(Math.max(1, w * h));
  let cursor = 0;
  for (const glyph of glyphs) {
    for (let y = 0; y < GLYPH; y++) {
      for (let x = 0; x < glyph.advance; x++) {
        if (!glyph.bits[y * GLYPH + x]) continue;
        const tx = vertical ? x : cursor + x;
        const ty = vertical ? cursor + y : y;
        bits[ty * w + tx] = 1;
      }
    }
    cursor += vertical ? GLYPH : glyph.advance;
  }
  return { w, h, bits };
}

/** Paint a bitmap's ink as horizontal runs; `keep` can drop pixels (broken signs). */
export function drawBitmap(
  ctx: CanvasRenderingContext2D,
  bitmap: Bitmap,
  x: number,
  y: number,
  color: string,
  keep?: (px: number, py: number) => boolean,
): void {
  ctx.fillStyle = color;
  for (let row = 0; row < bitmap.h; row++) {
    let start = -1;
    for (let col = 0; col <= bitmap.w; col++) {
      const on = col < bitmap.w && bitmap.bits[row * bitmap.w + col] === 1 && (!keep || keep(col, row));
      if (on && start < 0) start = col;
      if (!on && start >= 0) {
        ctx.fillRect(x + start, y + row, col - start, 1);
        start = -1;
      }
    }
  }
}

function rotateClockwise(bits: Uint8Array): Uint8Array {
  const out = new Uint8Array(GLYPH * GLYPH);
  for (let y = 0; y < GLYPH; y++) {
    for (let x = 0; x < GLYPH; x++) out[x * GLYPH + (GLYPH - 1 - y)] = bits[y * GLYPH + x];
  }
  return out;
}

function toTopRight(bits: Uint8Array): Uint8Array {
  let minX = GLYPH;
  let maxX = -1;
  let minY = GLYPH;
  for (let y = 0; y < GLYPH; y++) {
    for (let x = 0; x < GLYPH; x++) {
      if (!bits[y * GLYPH + x]) continue;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
    }
  }
  if (maxX < 0) return bits;
  const dx = GLYPH - 2 - maxX;
  const dy = 1 - minY;
  const out = new Uint8Array(GLYPH * GLYPH);
  for (let y = 0; y < GLYPH; y++) {
    for (let x = 0; x < GLYPH; x++) {
      if (!bits[y * GLYPH + x]) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < GLYPH && ny < GLYPH) out[ny * GLYPH + nx] = 1;
    }
  }
  return out;
}
