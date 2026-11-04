import { GEOMETRY } from '../../city/geometry';
import { createRng } from '../../city/seed';
import type { PlacedBuilding } from '../../city/types';
import { createSurface, type CanvasFactory, type Glow, type Sprite } from '../canvas';
import { hline, px, rect, vline } from '../draw';
import { rectGlow, shapeGlow } from '../glow';
import type { LightPool } from '../layers/street';
import { LANTERN, NOREN, NOREN_MARK, WINDOW, WOOD } from '../palette';

/**
 * Forked repos become small wooden izakaya: tiled roof, noren curtain over
 * a lattice door glowing with warm light, and red paper lanterns.
 */

export interface IzakayaArt {
  sprite: Sprite;
  glows: Glow[];
  pools: LightPool[];
}

const SIDE = 3;
const TOP = 2;
export const LANTERN_SIZE = { w: 6, h: 9 };

export function drawIzakaya(b: PlacedBuilding, createCanvas: CanvasFactory): IzakayaArt {
  const rng = createRng(b.seed).fork('izakaya');
  const { canvas, ctx } = createSurface(createCanvas, b.width + SIDE * 2, b.height + TOP);
  const ox = SIDE;
  const oy = TOP;
  const w = b.width;
  const { ground, upper, roof } = GEOMETRY.izakaya;
  const open = !b.abandoned && !b.archived;
  const toWorld = (x: number, y: number) => ({ x: b.x - SIDE + x, y: -b.height - TOP + y });
  const glows: Glow[] = [];

  drawTiledRoof(ctx, ox, oy, w, roof);

  // Upper floor: plaster between wooden posts, one lattice window.
  for (let f = 0; f < b.floors - 1; f++) {
    const fy = oy + roof + f * upper;
    rect(ctx, ox, fy, w, upper, WOOD.plaster);
    vline(ctx, ox, fy, upper, WOOD.dark);
    vline(ctx, ox + w - 1, fy, upper, WOOD.dark);
    hline(ctx, ox, fy + upper - 1, w, WOOD.dark);
    const winW = Math.min(16, w - 12);
    const winX = ox + Math.floor((w - winW) / 2);
    const lit = open && rng.chance(0.6);
    rect(ctx, winX, fy + 3, winW, 6, WOOD.dark);
    rect(ctx, winX + 1, fy + 4, winW - 2, 4, lit ? WOOD.paper : WINDOW.dark);
    for (let x = winX + 3; x < winX + winW - 1; x += 3) vline(ctx, x, fy + 4, 4, WOOD.shade);
    if (lit) glows.push(rectGlow(toWorld(winX + 1, fy + 4), winW - 2, 4, WINDOW.warm, 3, 0.25, createCanvas));
  }

  // Ground floor: wooden front, eave, lattice door, noren, lanterns.
  const gy = oy + b.height - ground;
  rect(ctx, ox, gy, w, ground, WOOD.base);
  for (let x = ox + 2; x < ox + w - 2; x += 3) vline(ctx, x, gy + 4, ground - 4, WOOD.shade);
  rect(ctx, ox, gy, 2, ground, WOOD.dark);
  rect(ctx, ox + w - 2, gy, 2, ground, WOOD.dark);
  drawEave(ctx, ox, gy, w);

  const doorW = w - 14;
  const doorX = ox + 7;
  const doorY = gy + 8;
  const doorH = ground - 9;
  rect(ctx, doorX - 1, doorY - 1, doorW + 2, doorH + 1, WOOD.dark);
  if (b.archived) {
    // Wooden storm shutters pulled across.
    rect(ctx, doorX, doorY, doorW, doorH, WOOD.shade);
    for (let y = doorY + 1; y < doorY + doorH; y += 3) hline(ctx, doorX, y, doorW, WOOD.dark);
  } else {
    rect(ctx, doorX, doorY, doorW, doorH, open ? WOOD.paper : WINDOW.dark);
    if (open) hline(ctx, doorX, doorY + doorH - 2, doorW, WOOD.paperHi);
    for (let x = doorX + 3; x < doorX + doorW; x += 4) vline(ctx, x, doorY, doorH, WOOD.light);
    for (let y = doorY + 3; y < doorY + doorH; y += 4) hline(ctx, doorX, y, doorW, WOOD.light);
    vline(ctx, doorX + Math.floor(doorW / 2), doorY, doorH, WOOD.dark);
  }
  hline(ctx, ox, oy + b.height - 1, w, WOOD.dark);

  if (open) {
    drawNoren(ctx, doorX, gy + 5, doorW, rng.int(0, NOREN.length - 1));
    glows.push(rectGlow(toWorld(doorX, doorY), doorW, doorH, WINDOW.warm, 4, 0.35, createCanvas));
  }

  const lanterns = w >= 48 || rng.chance(0.5) ? [ox + 1, ox + w - 1 - LANTERN_SIZE.w] : [ox + w - 1 - LANTERN_SIZE.w];
  for (const lx of lanterns) {
    drawLantern(ctx, lx, gy + 5, open);
    if (open) glows.push(lanternGlow(toWorld(lx, gy + 5), createCanvas));
  }

  const pools: LightPool[] = open ? [{ x: b.x + w / 2, radius: w * 0.6, tone: 'warm', strength: 0.9 }] : [];
  return { sprite: { canvas, ...toWorld(0, 0) }, glows, pools };
}

export function drawLantern(ctx: CanvasRenderingContext2D, x: number, y: number, lit: boolean): void {
  const body = lit ? LANTERN.body : LANTERN.off;
  const lo = lit ? LANTERN.lo : LANTERN.offLo;
  hline(ctx, x + 1, y, 4, LANTERN.cap);
  hline(ctx, x + 1, y + 1, 4, body);
  rect(ctx, x, y + 2, 6, 5, body);
  hline(ctx, x + 1, y + 7, 4, body);
  hline(ctx, x + 1, y + 8, 4, LANTERN.cap);
  hline(ctx, x, y + 3, 6, lo);
  hline(ctx, x, y + 5, 6, lo);
  vline(ctx, x, y + 2, 5, lo);
  if (lit) {
    vline(ctx, x + 3, y + 2, 4, LANTERN.hi);
    px(ctx, x + 2, y + 4, LANTERN.hi);
  }
}

const lanternGlowCache = new WeakMap<CanvasFactory, Glow>();

/** A lantern glow; every lit lantern looks the same, so the blur is shared. */
export function lanternGlow(at: { x: number; y: number }, createCanvas: CanvasFactory): Glow {
  let template = lanternGlowCache.get(createCanvas);
  if (!template) {
    const surface = createSurface(createCanvas, LANTERN_SIZE.w, LANTERN_SIZE.h);
    drawLantern(surface.ctx, 0, 0, true);
    template = shapeGlow({ x: 0, y: 0 }, surface.canvas, LANTERN.glow, 3, 0.85, createCanvas);
    lanternGlowCache.set(createCanvas, template);
  }
  return { ...template, x: at.x + template.x, y: at.y + template.y };
}

function drawTiledRoof(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  for (let row = 0; row < h; row++) {
    const inset = Math.max(0, h - 2 - row) - 1;
    const rx = x + inset;
    const rw = w - inset * 2;
    rect(ctx, rx, y + row, rw, 1, row === 0 ? WOOD.tileRidge : row % 2 === 0 ? WOOD.tileHi : WOOD.tile);
    if (row > 0 && row < h - 1) for (let tx = rx + 1; tx < rx + rw - 1; tx += 3) px(ctx, tx, y + row, WOOD.tileHi);
  }
  hline(ctx, x - 2, y + h - 1, w + 4, WOOD.tile);
}

function drawEave(ctx: CanvasRenderingContext2D, x: number, y: number, w: number): void {
  hline(ctx, x - 3, y, w + 6, WOOD.tileRidge);
  rect(ctx, x - 3, y + 1, w + 6, 2, WOOD.tile);
  for (let tx = x - 2; tx < x + w + 3; tx += 3) px(ctx, tx, y + 1, WOOD.tileHi);
  hline(ctx, x - 2, y + 3, w + 4, WOOD.dark);
}

function drawNoren(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, variant: number): void {
  const { cloth, hi } = NOREN[variant];
  const panels = w >= 30 ? 4 : 3;
  const panelW = Math.floor((w - (panels - 1)) / panels);
  for (let i = 0; i < panels; i++) {
    const px0 = x + i * (panelW + 1);
    rect(ctx, px0, y, panelW, 9, cloth);
    hline(ctx, px0, y, panelW, hi);
  }
  hline(ctx, x - 1, y - 1, w + 2, WOOD.dark);
  // A simple circular crest across the middle panels.
  const cx = x + Math.floor(w / 2) - 1;
  for (const [dx, dy] of [[0, 3], [1, 3], [2, 4], [2, 5], [1, 6], [0, 6], [-1, 5], [-1, 4]]) px(ctx, cx + dx, y + dy, NOREN_MARK);
}
