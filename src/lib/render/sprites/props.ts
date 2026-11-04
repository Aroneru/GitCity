import { PROP_WIDTH, UTILITY_POLE_HEIGHT } from '../../city/geometry';
import { createRng, type Rng } from '../../city/seed';
import type { Prop } from '../../city/types';
import { createSurface, type CanvasFactory, type Glow, type Sprite } from '../canvas';
import { hline, line, px, rect, vline } from '../draw';
import { rectGlow } from '../glow';
import type { LightPool } from '../layers/street';
import { PROPS } from '../palette';

/**
 * Street furniture on the far sidewalk. Vending machines and plants stand
 * against the buildings; poles and traffic lights stand at the curb.
 */

export interface PropArt {
  sprite: Sprite;
  glows: Glow[];
  pools: LightPool[];
}

type Ctx = CanvasRenderingContext2D;

const HEIGHT = { vending: 20, bicycles: 9, plants: 9, crates: 8, trafficLight: 46, pole: UTILITY_POLE_HEIGHT } as const;
/** World y of each prop's base: things at the wall stand further back than things at the curb. */
const BASE_Y = { vending: 2, bicycles: 6, plants: 3, crates: 3, trafficLight: 8, pole: 8 } as const;
/** Sprites are padded so arms and signal heads can overhang. */
const PAD_X = { vending: 0, bicycles: 0, plants: 0, crates: 0, trafficLight: 3, pole: 7 } as const;

export function drawProp(prop: Prop, createCanvas: CanvasFactory): PropArt {
  const rng = createRng(prop.seed);
  const w = PROP_WIDTH[prop.kind] + PAD_X[prop.kind] * 2;
  const h = HEIGHT[prop.kind];
  const { canvas, ctx } = createSurface(createCanvas, w, h);
  const sprite = { canvas, x: prop.x - PAD_X[prop.kind], y: BASE_Y[prop.kind] - h };
  const at = (x: number, y: number) => ({ x: sprite.x + x, y: sprite.y + y });
  const glows: Glow[] = [];
  const pools: LightPool[] = [];

  switch (prop.kind) {
    case 'vending': {
      drawVendingMachine(ctx, rng);
      glows.push(rectGlow(at(1, 2), 9, 10, PROPS.vendingPanel, 3, 0.55, createCanvas));
      pools.push({ x: prop.x + 5, radius: 11, tone: 'cool', strength: 0.75 });
      break;
    }
    case 'bicycles':
      drawBicycles(ctx, rng);
      break;
    case 'plants':
      drawPlant(ctx);
      break;
    case 'crates':
      drawCrates(ctx);
      break;
    case 'trafficLight': {
      drawTrafficLight(ctx, PAD_X.trafficLight);
      glows.push(rectGlow(at(PAD_X.trafficLight - 1, 1), 2, 2, PROPS.signalGo, 3, 0.8, createCanvas));
      glows.push(rectGlow(at(PAD_X.trafficLight + 2, 20), 2, 3, PROPS.signalGo, 2, 0.6, createCanvas));
      break;
    }
    case 'pole': {
      const lampSide = rng.chance(0.5) ? -1 : 1;
      const hasLamp = rng.chance(0.75);
      drawPole(ctx, PAD_X.pole, rng, hasLamp ? lampSide : 0);
      if (hasLamp) {
        const lampX = PAD_X.pole + 1 + lampSide * 6;
        glows.push(rectGlow(at(lampX - 1, 41), 3, 2, PROPS.lamp, 4, 0.7, createCanvas));
        pools.push({ x: prop.x + 1 + lampSide * 6, radius: 14, tone: 'cool', strength: 0.6 });
      }
      break;
    }
  }
  return { sprite, glows, pools };
}

function drawVendingMachine(ctx: Ctx, rng: Rng): void {
  const color = rng.pick(PROPS.vending);
  rect(ctx, 0, 0, 11, 20, color.body);
  vline(ctx, 10, 0, 20, color.shade);
  hline(ctx, 0, 19, 11, color.dark);
  // The lit display of drinks.
  rect(ctx, 1, 2, 9, 10, PROPS.vendingPanel);
  const drinks = ['#e8524a', '#4aa3e8', '#f2c94a', '#62c27a', '#e87ab0', '#ff9a3a', '#ffffff'];
  for (let row = 0; row < 3; row++) {
    const y = 3 + row * 3;
    for (let x = 2; x < 10; x += 2) rect(ctx, x, y, 1, 2, rng.pick(drinks));
    hline(ctx, 1, y + 2, 9, PROPS.vendingPanelLo);
  }
  rect(ctx, 1, 13, 9, 2, color.dark);
  px(ctx, 8, 13, '#ffd85a');
  rect(ctx, 2, 16, 6, 2, '#141625');
}

function drawBicycles(ctx: Ctx, rng: Rng): void {
  const count = rng.int(2, 3);
  for (let i = count - 1; i >= 0; i--) {
    const x = i * 5;
    const frame = rng.pick(PROPS.bikeFrame);
    wheel(ctx, x + 2, 6);
    wheel(ctx, x + 10, 6);
    line(ctx, x + 2, 6, x + 5, 3, frame);
    line(ctx, x + 5, 3, x + 9, 3, frame);
    line(ctx, x + 9, 3, x + 10, 6, frame);
    line(ctx, x + 5, 3, x + 6, 6, frame);
    hline(ctx, x + 4, 2, 3, PROPS.bikeDark);
    vline(ctx, x + 9, 1, 2, frame);
    rect(ctx, x + 10, 1, 3, 2, PROPS.basket);
  }
}

function wheel(ctx: Ctx, cx: number, cy: number): void {
  for (const [dx, dy] of [[-1, -2], [0, -2], [1, -2], [2, -1], [2, 0], [2, 1], [1, 2], [0, 2], [-1, 2], [-2, 1], [-2, 0], [-2, -1]]) {
    px(ctx, cx + dx, cy + dy, PROPS.bikeWheel);
  }
  px(ctx, cx, cy, PROPS.bikeDark);
}

function drawPlant(ctx: Ctx): void {
  rect(ctx, 1, 6, 5, 3, PROPS.pot);
  hline(ctx, 1, 8, 5, PROPS.potShade);
  rect(ctx, 0, 2, 7, 4, PROPS.leaf);
  rect(ctx, 2, 0, 3, 2, PROPS.leaf);
  px(ctx, 1, 2, PROPS.leafHi);
  px(ctx, 4, 1, PROPS.leafHi);
  px(ctx, 5, 3, PROPS.leafHi);
}

function drawCrates(ctx: Ctx): void {
  for (const [y, color] of [[4, PROPS.crateYellow], [0, PROPS.crateGreen]] as const) {
    rect(ctx, 0, y, 9, 4, color);
    hline(ctx, 0, y + 3, 9, PROPS.crateShade);
    for (let x = 1; x < 9; x += 2) px(ctx, x, y, '#2a2a30');
  }
}

function drawTrafficLight(ctx: Ctx, pad: number): void {
  vline(ctx, pad + 2, 4, HEIGHT.trafficLight - 4, PROPS.pole);
  vline(ctx, pad + 3, 4, HEIGHT.trafficLight - 4, PROPS.poleShade);
  // Car signal: three lamps, the "blue" (green) one lit.
  rect(ctx, pad - 2, 0, 10, 4, PROPS.signalBox);
  rect(ctx, pad - 1, 1, 2, 2, PROPS.signalGo);
  rect(ctx, pad + 2, 1, 2, 2, PROPS.signalOff);
  rect(ctx, pad + 5, 1, 2, 2, PROPS.signalOff);
  // Pedestrian signal with a little walking figure.
  rect(ctx, pad + 1, 18, 4, 7, PROPS.signalBox);
  px(ctx, pad + 3, 19, PROPS.signalOff);
  px(ctx, pad + 2, 21, PROPS.signalGo);
  px(ctx, pad + 3, 21, PROPS.signalGo);
  px(ctx, pad + 2, 22, PROPS.signalGo);
  px(ctx, pad + 3, 23, PROPS.signalGo);
}

/** A concrete utility pole with crossarms, a transformer, and an optional street lamp. */
function drawPole(ctx: Ctx, pad: number, rng: Rng, lampSide: -1 | 0 | 1): void {
  const h = HEIGHT.pole;
  rect(ctx, pad, 0, 3, h, PROPS.pole);
  vline(ctx, pad + 2, 0, h, PROPS.poleShade);
  vline(ctx, pad, 0, h, PROPS.poleLit);
  // Crossarms with insulators.
  hline(ctx, pad - 6, 3, 15, PROPS.poleShade);
  for (const x of [pad - 6, pad + 1, pad + 8]) px(ctx, x, 2, PROPS.insulator);
  hline(ctx, pad - 4, 11, 11, PROPS.poleShade);
  for (const x of [pad - 4, pad + 6]) px(ctx, x, 10, PROPS.insulator);
  // Transformer drum.
  const side = rng.chance(0.5) ? -1 : 1;
  const tx = side < 0 ? pad - 5 : pad + 3;
  if (rng.chance(0.6)) {
    rect(ctx, tx, 16, 5, 8, PROPS.transformer);
    vline(ctx, tx + (side < 0 ? 0 : 4), 16, 8, PROPS.poleShade);
    hline(ctx, tx, 16, 5, PROPS.poleLit);
  }
  // Blue address plate.
  rect(ctx, pad, 54, 3, 6, PROPS.plate);
  // Yellow and black guard at the base.
  for (let y = h - 12; y < h; y++) rect(ctx, pad, y, 3, 1, Math.floor(y / 2) % 2 === 0 ? PROPS.guardYellow : PROPS.guardBlack);
  if (lampSide !== 0) {
    const armEnd = pad + 1 + lampSide * 6;
    hline(ctx, Math.min(pad + 1, armEnd), 39, 7, PROPS.poleShade);
    vline(ctx, armEnd, 39, 2, PROPS.poleShade);
    rect(ctx, armEnd - 1, 41, 3, 2, PROPS.lamp);
  }
}

/**
 * The tangle of wires strung between consecutive poles, as one sprite
 * spanning the street. Each pole carries three wires on its top crossarm
 * and two lower cables, all sagging between poles.
 */
export function drawWires(poles: Prop[], width: number, createCanvas: CanvasFactory): Sprite | null {
  if (poles.length < 2) return null;
  const top = BASE_Y.pole - HEIGHT.pole - 2;
  const height = 40;
  const { canvas, ctx } = createSurface(createCanvas, width, height);
  const sorted = [...poles].sort((a, b) => a.x - b.x);

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i].x + 1;
    const b = sorted[i + 1].x + 1;
    const span = b - a;
    const rng = createRng(sorted[i].seed).fork('wires');
    // [x offset from the pole, height on the pole, sag as a share of the span]
    const wires: Array<[number, number, number]> = [
      [-6, 4, 0.025],
      [8, 4, 0.035],
      [rng.chance(0.5) ? -4 : 6, 12, 0.05 + rng.float(0, 0.03)],
    ];
    for (const [dx, y, sagRatio] of wires) {
      const sag = span * sagRatio;
      let prevY = y;
      for (let x = 0; x <= span; x++) {
        const t = x / span;
        const wy = Math.round(y + sag * 4 * t * (1 - t));
        const wx = a + dx + x;
        if (wx < 0 || wx >= width) continue;
        const y0 = Math.min(prevY, wy);
        const y1 = Math.max(prevY, wy);
        rect(ctx, wx, y0, 1, y1 - y0 + 1, PROPS.wire);
        prevY = wy;
      }
    }
  }
  return { canvas, x: 0, y: top };
}
