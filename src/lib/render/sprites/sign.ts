import { GEOMETRY, GLYPH, SIGN_PAD } from '../../city/geometry';
import { createRng } from '../../city/seed';
import type { PlacedBuilding } from '../../city/types';
import type { SignBehavior } from '../animation';
import { createSurface, type CanvasFactory, type Glow, type Sprite } from '../canvas';
import { hline, rect } from '../draw';
import { drawBitmap, textBitmap, type Bitmap, type GlyphAtlas } from '../glyphs';
import { shapeGlow } from '../glow';
import { NEON, SIGN_BOARD, type NeonColors } from '../palette';

/**
 * Building signs. Vertical signs hang at a facade edge and overhang the
 * neighbour; horizontal boards sit over the shop front. Colors follow the
 * repo's language. Abandoned buildings keep a dying neon sign: one
 * character still sputters while the rest are dead tubes, drawn complete
 * but unlit so they stay real, readable characters.
 */

export interface SignArt {
  /** The sign with its lights on. */
  sprite: Sprite;
  /** The same sign with its lights off, for signs that flicker. */
  off: HTMLCanvasElement | null;
  seed: number;
  behavior: SignBehavior;
  glows: Glow[];
}

type Style = 'neon' | 'lightbox' | 'paper';

export function drawSign(b: PlacedBuilding, atlas: GlyphAtlas, createCanvas: CanvasFactory): SignArt {
  const rng = createRng(b.seed).fork('sign-style');
  const vertical = b.sign.orientation === 'vertical';
  const text = textBitmap(atlas, b.sign.text, vertical);
  const w = text.w + SIGN_PAD * 2;
  const h = text.h + SIGN_PAD * 2;
  const neon = NEON[b.neon];

  const style: Style = !b.sign.lit
    ? 'paper'
    : b.abandoned
      ? 'neon'
      : b.kind === 'tower'
        ? rng.chance(0.8) ? 'neon' : 'lightbox'
        : b.kind === 'midrise'
          ? rng.chance(0.55) ? 'neon' : 'lightbox'
          : b.kind === 'izakaya'
            ? 'lightbox'
            : rng.chance(0.4) ? 'neon' : 'lightbox';
  const behavior: SignBehavior =
    style === 'paper' ? 'steady' : b.abandoned ? 'broken' : rng.chance(style === 'neon' ? 0.3 : 0.12) ? 'flickery' : 'steady';

  const { x, y } = signPosition(b, w, h);
  const on = createSurface(createCanvas, w, h);
  const lit = createSurface(createCanvas, w, h);
  const broken = behavior === 'broken';
  const liveChar = broken ? rng.int(0, [...b.sign.text].length - 1) : -1;
  const isLive = (px: number, py: number) => !broken || Math.floor((vertical ? py : px) / GLYPH) === liveChar;

  rect(on.ctx, 0, 0, w, h, SIGN_BOARD.frame);
  if (style === 'neon') drawNeonBoard(on.ctx, lit.ctx, text, w, h, neon, broken, isLive);
  else if (style === 'lightbox') drawLightbox(on.ctx, lit.ctx, text, w, h, neon, b.kind === 'izakaya');
  else drawUnlit(on.ctx, text, w, h, SIGN_BOARD.paper, SIGN_BOARD.paperText);

  let off: HTMLCanvasElement | null = null;
  if (behavior !== 'steady') {
    const dark = createSurface(createCanvas, w, h);
    if (style === 'neon') {
      drawUnlit(dark.ctx, text, w, h, SIGN_BOARD.dark, neon.dim);
      strokeRect(dark.ctx, 1, 1, w - 2, h - 2, neon.dim);
    } else {
      drawUnlit(dark.ctx, text, w, h, neon.dim, SIGN_BOARD.frame);
    }
    off = dark.canvas;
  }

  const glows: Glow[] = [];
  const pulse = behavior === 'steady' ? undefined : ({ kind: 'neon', seed: b.seed, behavior } as const);
  if (style === 'neon') glows.push({ ...shapeGlow({ x, y }, lit.canvas, neon.glow, 2, broken ? 0.5 : 0.7, createCanvas), pulse });
  else if (style === 'lightbox') glows.push({ ...shapeGlow({ x, y }, lit.canvas, neon.glow, 3, 0.6, createCanvas), pulse });

  return { sprite: { canvas: on.canvas, x, y }, off, seed: b.seed, behavior, glows };
}

function signPosition(b: PlacedBuilding, w: number, h: number): { x: number; y: number } {
  if (b.sign.orientation === 'vertical') {
    const x = b.sign.side === 'left' ? b.x - 4 : b.x + b.width - w + 4;
    const y = b.kind === 'tower' ? -b.height + GEOMETRY.parapet + 4 : -(GEOMETRY.groundFloor - 2) - h;
    return { x, y };
  }
  const x = b.x + Math.round((b.width - w) / 2);
  const bottom = b.kind === 'izakaya' ? -(GEOMETRY.izakaya.ground - 2) : -(GEOMETRY.groundFloor - 5);
  return { x, y: bottom - h };
}

function drawNeonBoard(
  ctx: CanvasRenderingContext2D,
  lit: CanvasRenderingContext2D,
  text: Bitmap,
  w: number,
  h: number,
  neon: NeonColors,
  broken: boolean,
  isLive: (x: number, y: number) => boolean,
): void {
  rect(ctx, 1, 1, w - 2, h - 2, SIGN_BOARD.dark);
  // The neon tube framing the board.
  strokeRect(ctx, 1, 1, w - 2, h - 2, broken ? neon.dim : neon.tube);
  if (!broken) strokeRect(lit, 1, 1, w - 2, h - 2, '#ffffff');

  // Lit strokes are drawn in the near-white core so thin kanji stay crisp;
  // the hue comes from the glow around them.
  drawBitmap(ctx, text, SIGN_PAD, SIGN_PAD, neon.dim);
  drawBitmap(ctx, text, SIGN_PAD, SIGN_PAD, neon.core, isLive);
  drawBitmap(lit, text, SIGN_PAD, SIGN_PAD, '#ffffff', isLive);
}

function drawLightbox(
  ctx: CanvasRenderingContext2D,
  lit: CanvasRenderingContext2D,
  text: Bitmap,
  w: number,
  h: number,
  neon: NeonColors,
  cream: boolean,
): void {
  rect(ctx, 1, 1, w - 2, h - 2, cream ? SIGN_BOARD.cream : neon.box);
  hline(ctx, 1, 1, w - 2, neon.core);
  drawBitmap(ctx, text, SIGN_PAD, SIGN_PAD, neon.boxText);
  // The glow spills from the box's rim, so it never washes out the lettering.
  strokeRect(lit, 0, 0, w, h, '#ffffff');
  strokeRect(lit, 1, 1, w - 2, h - 2, '#ffffff');
}

/** A board whose lights are off (or a paper notice): plain face, plain lettering. */
function drawUnlit(ctx: CanvasRenderingContext2D, text: Bitmap, w: number, h: number, face: string, ink: string): void {
  rect(ctx, 0, 0, w, h, SIGN_BOARD.frame);
  rect(ctx, 1, 1, w - 2, h - 2, face);
  drawBitmap(ctx, text, SIGN_PAD, SIGN_PAD, ink);
}

function strokeRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  rect(ctx, x, y, w, 1, color);
  rect(ctx, x, y + h - 1, w, 1, color);
  rect(ctx, x, y, 1, h, color);
  rect(ctx, x + w - 1, y, 1, h, color);
}
