import { GEOMETRY } from '../../city/geometry';
import { createRng, type Rng } from '../../city/seed';
import type { PlacedBuilding } from '../../city/types';
import { createSurface, type CanvasFactory, type Glow, type Sprite } from '../canvas';
import { dither, hline, px, rect, vline } from '../draw';
import { rectGlow } from '../glow';
import { ABANDONED, MATERIALS, NEON, ROOF, SHOP, SIGN_BOARD, WINDOW, type Material } from '../palette';
import { drawTinyText, fitTinyText, TINY_GLYPH_HEIGHT, tinyTextWidth } from '../pixelfont';
import type { LightPool } from '../layers/street';

/**
 * Sprites for shops, mid-rises and towers: facade, windows lit by recent
 * activity, the ground floor, rooftop clutter and the star-tier rooftop.
 * Signs are drawn separately (see sign.ts) because they overhang neighbours.
 */

export interface BuildingArt {
  sprite: Sprite;
  glows: Glow[];
  pools: LightPool[];
}

const SIDE = 4;
type Ctx = CanvasRenderingContext2D;

const MATERIALS_BY_KIND: Record<'shop' | 'midrise' | 'tower', Material[]> = {
  shop: [MATERIALS.tile, MATERIALS.brick, MATERIALS.concrete, MATERIALS.pale],
  midrise: [MATERIALS.concrete, MATERIALS.tile, MATERIALS.brick, MATERIALS.teal, MATERIALS.pale],
  tower: [MATERIALS.glass, MATERIALS.glass, MATERIALS.concrete, MATERIALS.teal, MATERIALS.pale],
};

export function drawBuilding(b: PlacedBuilding, createCanvas: CanvasFactory): BuildingArt {
  if (b.kind === 'izakaya') throw new Error('Izakaya are drawn by drawIzakaya');
  const rng = createRng(b.seed).fork('facade');
  const top = GEOMETRY.rooftopExtra[b.rooftop] + 2;
  const { canvas, ctx } = createSurface(createCanvas, b.width + SIDE * 2, b.height + top);
  const ox = SIDE;
  const oy = top;
  const material = b.abandoned ? ABANDONED : rng.pick(MATERIALS_BY_KIND[b.kind]);
  const glows: Glow[] = [];
  const pools: LightPool[] = [];
  const toWorld = (x: number, y: number) => ({ x: b.x - SIDE + x, y: -b.height - top + y });
  const addGlow: GlowAdder = (x, y, w, h, color, radius, alpha) => {
    glows.push(rectGlow(toWorld(x, y), w, h, color, radius, alpha, createCanvas));
  };

  drawFacade(ctx, b, material, ox, oy, rng);
  const front = drawGroundFloor(ctx, b, material, ox, oy, rng);
  if (front) {
    pools.push({ x: b.x + front.x - ox + front.w / 2, radius: Math.max(8, front.w * 0.7), tone: front.tone, strength: front.strength });
    addGlow(front.x, front.y, front.w, front.h, front.tone === 'warm' ? WINDOW.warm : SHOP.lobby, 3, front.tone === 'warm' ? 0.18 : 0.1);
  }
  drawRoofClutter(ctx, b, ox, oy, rng);
  drawRooftopTier(ctx, b, ox, oy, rng, addGlow);

  return { sprite: { canvas, ...toWorld(0, 0) }, glows, pools };
}

function drawFacade(ctx: Ctx, b: PlacedBuilding, m: Material, ox: number, oy: number, rng: Rng): void {
  const { width: w, height: h } = b;
  rect(ctx, ox, oy, w, h, m.base);
  vline(ctx, ox, oy, h, m.shade);
  vline(ctx, ox + w - 1, oy, h, m.light);

  // Parapet.
  rect(ctx, ox, oy, w, GEOMETRY.parapet, m.trim);
  hline(ctx, ox, oy, w, m.light);
  hline(ctx, ox, oy + GEOMETRY.parapet, w, m.line);

  const style = windowStyle(b, m, rng);
  const upperFloors = b.floors - 1;
  for (let f = 0; f < upperFloors; f++) {
    const fy = oy + GEOMETRY.parapet + f * GEOMETRY.floor;
    hline(ctx, ox + 1, fy + GEOMETRY.floor - 1, w - 2, m.line);
    const floorLit = rng.next() < b.litRatio;
    style(fy, (lit) => lit || (floorLit ? rng.next() < 0.8 : rng.next() < b.litRatio * 0.25));
  }

  // A drainpipe and the odd external staircase on mid-rises.
  if (b.kind !== 'tower' && rng.chance(0.5)) {
    const pipeX = b.sign.side === 'left' ? ox + w - 3 : ox + 2;
    vline(ctx, pipeX, oy + GEOMETRY.parapet, h - GEOMETRY.parapet - GEOMETRY.groundFloor, m.line);
  }
  if (b.kind === 'midrise' && !b.abandoned) drawTenantBoxes(ctx, b, ox, oy, rng);
  if (b.abandoned) {
    // Grime on the facade.
    dither(ctx, ox + 1, oy + GEOMETRY.parapet + 1, w - 2, h - GEOMETRY.parapet - GEOMETRY.groundFloor - 1, m.line, 0.06);
  }

  function windowStyle(building: PlacedBuilding, material: Material, r: Rng) {
    type LitTest = (forced: boolean) => boolean;
    const cool = building.kind === 'tower' ? 0.55 : building.kind === 'midrise' ? 0.3 : 0.08;
    const paint = (x: number, y: number, ww: number, wh: number, lit: boolean) =>
      drawWindow(ctx, x, y, ww, wh, lit ? (r.chance(0.04) ? 'tv' : r.chance(cool) ? 'cool' : 'warm') : 'dark', building.abandoned, r);

    if (building.kind === 'tower' && material === MATERIALS.glass) {
      // Curtain wall: a continuous glass band per floor.
      return (fy: number, isLit: LitTest) => {
        rect(ctx, ox + 2, fy + 2, w - 4, 6, MATERIALS.glass.line);
        for (let x = ox + 3; x + 3 <= ox + w - 2; x += 4) paint(x, fy + 2, 3, 6, isLit(false));
      };
    }
    if (building.kind === 'tower') {
      return (fy: number, isLit: LitTest) => {
        for (let x = ox + 3; x + 5 <= ox + w - 2; x += 6) paint(x, fy + 2, 5, 5, isLit(false));
      };
    }
    if (building.kind === 'midrise') {
      const n = Math.floor((w - 4) / 6);
      const start = ox + Math.floor((w - (n * 6 - 2)) / 2);
      return (fy: number, isLit: LitTest) => {
        for (let i = 0; i < n; i++) paint(start + i * 6, fy + 2, 4, 5, isLit(false));
      };
    }
    // Shops: flats above with small balconies and the odd AC unit.
    const n = Math.max(1, Math.floor((w - 4) / 9));
    const start = ox + Math.floor((w - (n * 9 - 3)) / 2);
    return (fy: number, isLit: LitTest) => {
      for (let i = 0; i < n; i++) {
        const x = start + i * 9;
        paint(x, fy + 1, 6, 5, isLit(false));
        hline(ctx, x - 1, fy + 7, 8, material.trim);
        for (let p = x - 1; p < x + 7; p += 2) px(ctx, p, fy + 6, material.trim);
        if (r.chance(0.3)) {
          rect(ctx, x + 6, fy + 4, 2, 2, ROOF.ac);
          px(ctx, x + 6, fy + 5, ROOF.acShade);
        }
      }
    };
  }
}

function drawWindow(ctx: Ctx, x: number, y: number, w: number, h: number, kind: 'warm' | 'cool' | 'tv' | 'dark', abandoned: boolean, rng: Rng): void {
  if (kind === 'dark') {
    rect(ctx, x, y, w, h, WINDOW.dark);
    if (abandoned && rng.chance(0.25)) {
      // A cracked pane.
      px(ctx, x + rng.int(0, w - 1), y + rng.int(0, h - 1), WINDOW.broken);
      px(ctx, x + rng.int(0, w - 1), y + rng.int(0, h - 1), WINDOW.broken);
    } else {
      px(ctx, x + w - 1, y, WINDOW.darkHi);
    }
    return;
  }
  const [base, hi, lo] =
    kind === 'warm' ? [WINDOW.warm, WINDOW.warmHi, WINDOW.warmLo] : kind === 'cool' ? [WINDOW.cool, WINDOW.coolHi, WINDOW.coolLo] : [WINDOW.tv, WINDOW.coolHi, WINDOW.coolLo];
  rect(ctx, x, y, w, h, base);
  hline(ctx, x, y, w, hi);
  if (w >= 4 && rng.chance(0.45)) vline(ctx, rng.chance(0.5) ? x : x + w - 1, y + 1, h - 1, kind === 'warm' ? WINDOW.curtain : lo);
  else hline(ctx, x, y + h - 1, w, lo);
}

/** Mid-rise tenants: a column of small lightboxes, one per floor. */
function drawTenantBoxes(ctx: Ctx, b: PlacedBuilding, ox: number, oy: number, rng: Rng): void {
  const colors = ['#fff3d6', '#ffe08a', '#ffd1e8', '#cfefff', '#e8e8e8'];
  const x = b.sign.side === 'left' ? ox + b.width - 7 : ox + 1;
  for (let f = 0; f < b.floors - 1; f++) {
    if (!rng.chance(0.7)) continue;
    const fy = oy + GEOMETRY.parapet + f * GEOMETRY.floor + 2;
    rect(ctx, x, fy, 6, 5, SIGN_BOARD.frame);
    rect(ctx, x + 1, fy + 1, 4, 3, b.litRatio > 0 || rng.chance(0.5) ? rng.pick(colors) : WINDOW.dark);
  }
}

interface ShopFront {
  x: number;
  y: number;
  w: number;
  h: number;
  tone: 'warm' | 'cool';
  strength: number;
}

function drawGroundFloor(ctx: Ctx, b: PlacedBuilding, m: Material, ox: number, oy: number, rng: Rng): ShopFront | null {
  const w = b.width;
  const gy = oy + b.height - GEOMETRY.groundFloor;
  // Fascia band where the shop sign mounts.
  rect(ctx, ox, gy, w, 6, m.trim);
  hline(ctx, ox, gy, w, m.light);
  hline(ctx, ox, gy + 5, w, m.line);
  const fy = gy + 6;
  const fh = GEOMETRY.groundFloor - 7;
  hline(ctx, ox, oy + b.height - 1, w, m.line);

  if (b.abandoned) {
    drawBoarded(ctx, ox + 2, fy, w - 4, fh);
    return null;
  }
  if (b.archived) {
    drawShutter(ctx, ox + 2, fy, w - 4, fh);
    return null;
  }

  if (b.kind === 'tower') {
    // Lobby glass between columns, under a canopy.
    rect(ctx, ox + 1, fy, w - 2, fh, SHOP.frame);
    rect(ctx, ox + 2, fy + 2, w - 4, fh - 2, SHOP.lobby);
    hline(ctx, ox + 2, fy + 2, w - 4, SHOP.lobbyHi);
    for (let x = ox + 2; x < ox + w - 2; x += 8) vline(ctx, x, fy + 2, fh - 2, m.shade);
    rect(ctx, ox, fy, w, 2, m.trim);
    const door = ox + Math.floor(w / 2) - 3;
    rect(ctx, door, fy + 5, 6, fh - 5, SHOP.interiorHi);
    vline(ctx, door + 3, fy + 5, fh - 5, SHOP.frame);
    return { x: ox + 2, y: fy + 2, w: w - 4, h: fh - 2, tone: 'cool', strength: 0.75 };
  }

  if (b.kind === 'midrise') {
    // A narrow lit stairwell entrance beside a small shop.
    const doorX = b.sign.side === 'left' ? ox + w - 9 : ox + 2;
    rect(ctx, doorX, fy + 2, 7, fh - 2, SHOP.frame);
    rect(ctx, doorX + 1, fy + 3, 5, fh - 3, SHOP.lobby);
    hline(ctx, doorX + 1, fy + 3, 5, SHOP.lobbyHi);
    const shopX = b.sign.side === 'left' ? ox + 2 : ox + 10;
    const shopW = w - 12;
    if (rng.chance(0.3 + b.litRatio * 0.6)) {
      drawStorefront(ctx, shopX, fy, shopW, fh, rng);
      return { x: shopX, y: fy, w: shopW, h: fh, tone: 'warm', strength: 0.7 };
    }
    drawShutter(ctx, shopX, fy, shopW, fh);
    return { x: doorX + 1, y: fy + 3, w: 5, h: fh - 3, tone: 'cool', strength: 0.45 };
  }

  // Shop: open late, or shutters down.
  if (rng.chance(0.35 + b.litRatio * 0.6)) {
    drawStorefront(ctx, ox + 2, fy, w - 4, fh, rng);
    return { x: ox + 2, y: fy, w: w - 4, h: fh, tone: 'warm', strength: 0.85 };
  }
  drawShutter(ctx, ox + 2, fy, w - 4, fh);
  return null;
}

function drawStorefront(ctx: Ctx, x: number, y: number, w: number, h: number, rng: Rng): void {
  const [stripe, stripeAlt] = rng.pick(SHOP.awnings);
  // Striped awning with a scalloped edge.
  for (let i = 0; i < w; i++) rect(ctx, x + i, y, 1, 3, Math.floor(i / 2) % 2 === 0 ? stripe : stripeAlt);
  for (let i = 0; i < w; i += 2) px(ctx, x + i, y + 3, stripe);
  // Lit interior with shelves of goods.
  const gy = y + 4;
  const gh = h - 4;
  rect(ctx, x, gy, w, gh, SHOP.frame);
  rect(ctx, x + 1, gy + 1, w - 2, gh - 1, SHOP.interior);
  hline(ctx, x + 1, gy + 1, w - 2, SHOP.interiorHi);
  for (let sy = gy + 4; sy < gy + gh - 1; sy += 4) {
    hline(ctx, x + 1, sy, w - 2, SHOP.shelf);
    for (let sx = x + 2; sx < x + w - 2; sx += 2) if (rng.chance(0.6)) px(ctx, sx, sy - 1, rng.pick(SHOP.shelfItems));
  }
  // Door frame.
  const door = x + Math.floor(w * (rng.chance(0.5) ? 0.25 : 0.65));
  vline(ctx, door, gy + 1, gh - 1, SHOP.frame);
  vline(ctx, door + 5, gy + 1, gh - 1, SHOP.frame);
}

function drawShutter(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  rect(ctx, x, y, w, h, SHOP.shutter);
  for (let sy = y + 1; sy < y + h; sy += 2) hline(ctx, x, sy, w, SHOP.shutterLine);
  hline(ctx, x, y, w, SHOP.shutterHi);
  hline(ctx, x, y + h - 1, w, SHOP.shutterHi);
}

function drawBoarded(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  rect(ctx, x, y, w, h, WINDOW.dark);
  for (let sy = y + 1; sy < y + h - 1; sy += 4) {
    rect(ctx, x, sy, w, 3, SHOP.board);
    hline(ctx, x, sy + 2, w, SHOP.boardLine);
  }
}

function drawRoofClutter(ctx: Ctx, b: PlacedBuilding, ox: number, oy: number, rng: Rng): void {
  const w = b.width;
  if (rng.chance(0.5)) {
    // Railing along the roof edge.
    hline(ctx, ox, oy - 3, w, ROOF.rail);
    for (let x = ox; x < ox + w; x += 4) vline(ctx, x, oy - 3, 3, ROOF.rail);
  }
  if (b.rooftop !== 'none') return; // the star-tier rooftop takes the space
  const roll = rng.next();
  if (b.kind !== 'shop' && roll < 0.45) {
    // Water tank on legs.
    const tx = ox + rng.int(2, Math.max(2, w - 10));
    rect(ctx, tx, oy - 9, 8, 6, ROOF.tank);
    hline(ctx, tx, oy - 9, 8, ROOF.tankHi);
    vline(ctx, tx + 7, oy - 8, 5, ROOF.tankShade);
    vline(ctx, tx + 1, oy - 3, 3, ROOF.metal);
    vline(ctx, tx + 6, oy - 3, 3, ROOF.metal);
  } else if (b.kind !== 'shop' && roll < 0.75) {
    // Stairwell hut with a lit door.
    const hx = rng.chance(0.5) ? ox + 2 : ox + w - 13;
    rect(ctx, hx, oy - 8, 11, 8, ROOF.metal);
    hline(ctx, hx, oy - 8, 11, ROOF.metalHi);
    rect(ctx, hx + 2, oy - 6, 3, 6, b.abandoned ? WINDOW.dark : ROOF.hutLight);
  } else {
    // AC units.
    const count = rng.int(1, 3);
    for (let i = 0; i < count; i++) {
      const ax = ox + 3 + i * 6 + rng.int(0, 2);
      if (ax + 5 > ox + w) break;
      rect(ctx, ax, oy - 4, 5, 4, ROOF.ac);
      hline(ctx, ax, oy - 4, 5, ROOF.metalHi);
      px(ctx, ax + 2, oy - 2, ROOF.acShade);
    }
  }
}

type GlowAdder = (x: number, y: number, w: number, h: number, color: string, radius: number, alpha: number) => void;

function drawRooftopTier(ctx: Ctx, b: PlacedBuilding, ox: number, oy: number, rng: Rng, addGlow: GlowAdder): void {
  if (b.rooftop === 'none') return;
  const w = b.width;
  const neon = NEON[b.neon];

  if (b.rooftop === 'antenna') {
    const ax = ox + rng.int(3, Math.max(3, w - 6));
    const height = 20;
    vline(ctx, ax, oy - height, height, ROOF.metalHi);
    vline(ctx, ax + 1, oy - height + 2, height - 2, ROOF.metal);
    for (let y = oy - height + 3; y < oy; y += 3) {
      px(ctx, ax - 1, y, ROOF.metal);
      px(ctx, ax + 2, y, ROOF.metal);
    }
    hline(ctx, ax - 3, oy - height + 4, 8, ROOF.metal);
    hline(ctx, ax - 2, oy - height + 8, 6, ROOF.metal);
    return;
  }

  // Billboard: a lit panel on legs with the repo's name.
  const bw = Math.min(w - 4, 48);
  const bh = 12;
  const bx = ox + Math.floor((w - bw) / 2);
  const by = oy - 4 - bh;
  vline(ctx, bx + 3, by + bh, 4, ROOF.metal);
  vline(ctx, bx + bw - 4, by + bh, 4, ROOF.metal);
  rect(ctx, bx, by, bw, bh, SIGN_BOARD.frame);
  const lit = !b.abandoned;
  rect(ctx, bx + 1, by + 1, bw - 2, bh - 2, lit ? neon.box : neon.dim);
  const label = fitTinyText(b.id.toUpperCase(), bw - 6);
  drawTinyText(ctx, label, bx + Math.floor((bw - tinyTextWidth(label)) / 2), by + Math.floor((bh - TINY_GLYPH_HEIGHT) / 2), lit ? neon.boxText : SIGN_BOARD.frame);
  px(ctx, bx + 2, by - 1, ROOF.hutLight);
  px(ctx, bx + bw - 3, by - 1, ROOF.hutLight);
  if (lit) addGlow(bx + 1, by + 1, bw - 2, bh - 2, neon.glow, 3, 0.45);

  if (b.rooftop === 'beacon') {
    const mx = bx + bw - 6;
    const mastTop = by - 20;
    vline(ctx, mx, mastTop, 20, ROOF.metalHi);
    for (let y = mastTop + 3; y < by; y += 4) hline(ctx, mx - 1, y, 3, ROOF.metal);
    rect(ctx, mx - 1, mastTop - 2, 3, 2, '#ff3030');
    px(ctx, mx, mastTop - 2, '#ffb0a0');
    addGlow(mx - 1, mastTop - 2, 3, 2, '#ff2a2a', 4, 0.9);
  }
}
