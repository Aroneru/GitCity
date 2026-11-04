import type { Rng } from '../../city/seed';
import { createSurface, type CanvasFactory } from '../canvas';
import { hline, line, px, rect, vline } from '../draw';
import { glowOffset, makeGlow } from '../glow';

/**
 * Things that move: a commuter train for the elevated railway, and the
 * cars, taxi, kei car and cyclist that pass along the street. Each is
 * drawn facing right, then mirrored, and comes with a glow for its lights.
 */

export interface MovingSprite {
  right: HTMLCanvasElement;
  left: HTMLCanvasElement;
  /** Its lights (windows, lamps, headlight beam), blurred. */
  glowRight: HTMLCanvasElement;
  glowLeft: HTMLCanvasElement;
  /** Where each glow sits relative to the sprite's top-left corner. */
  glowAt: { right: { x: number; y: number }; left: { x: number; y: number } };
  w: number;
  h: number;
}

export type VehicleKind = 'sedan' | 'taxi' | 'kei' | 'cyclist';

export interface VehicleArt {
  sedan: MovingSprite;
  taxi: MovingSprite;
  kei: MovingSprite;
  cyclist: MovingSprite;
  /** The rainy-night cyclist, holding an umbrella. */
  cyclistUmbrella: MovingSprite;
}

const TRAIN = { cars: 5, car: 46, gap: 2, height: 15 } as const;
export const TRAIN_LENGTH = TRAIN.cars * TRAIN.car + (TRAIN.cars - 1) * TRAIN.gap;

export function buildTrain(rng: Rng, createCanvas: CanvasFactory): MovingSprite {
  const { canvas, ctx } = createSurface(createCanvas, TRAIN_LENGTH, TRAIN.height);
  const lights = createSurface(createCanvas, TRAIN_LENGTH, TRAIN.height);

  for (let c = 0; c < TRAIN.cars; c++) {
    const x0 = c * (TRAIN.car + TRAIN.gap);
    // Silver body with a teal stripe and a dark skirt.
    rect(ctx, x0, 3, TRAIN.car, 10, '#b7bdca');
    hline(ctx, x0, 3, TRAIN.car, '#d9dde7');
    hline(ctx, x0, 4, TRAIN.car, '#a7aebd');
    hline(ctx, x0, 10, TRAIN.car, '#2f9e7a');
    hline(ctx, x0, 11, TRAIN.car, '#1f7a5e');
    hline(ctx, x0, 12, TRAIN.car, '#7c8396');
    // Lit windows, some with passengers, and two doors per car.
    for (let wx = x0 + 3; wx + 3 <= x0 + TRAIN.car - 3; wx += 5) {
      const door = wx - x0 === 13 || wx - x0 === 33;
      if (door) {
        rect(ctx, wx, 5, 3, 7, '#9aa1b2');
        rect(ctx, wx + 1, 5, 1, 3, '#f6e9c6');
        rect(lights.ctx, wx + 1, 5, 1, 3, '#ffffff');
        continue;
      }
      rect(ctx, wx, 5, 3, 3, rng.chance(0.7) ? '#f6e9c6' : '#dcecff');
      rect(lights.ctx, wx, 5, 3, 3, '#ffffff');
      if (rng.chance(0.35)) px(ctx, wx + rng.int(0, 2), 7, '#4a4f66');
    }
    // Bogies.
    rect(ctx, x0 + 4, 13, 8, 2, '#262a3c');
    rect(ctx, x0 + TRAIN.car - 12, 13, 8, 2, '#262a3c');
    px(ctx, x0 + 5, 14, '#5a5e78');
    px(ctx, x0 + TRAIN.car - 6, 14, '#5a5e78');
    if (c < TRAIN.cars - 1) rect(ctx, x0 + TRAIN.car, 7, TRAIN.gap, 2, '#3a3f55');
    if (c % 2 === 1) {
      // Pantograph reaching for the overhead wire.
      for (const [dx, dy] of [[0, 2], [-1, 1], [1, 1], [0, 0], [-2, 0], [2, 0]]) px(ctx, x0 + 22 + dx, dy, '#6a6f88');
    }
  }
  // The leading end: a sloped nose, a headlight and a destination box.
  const nose = TRAIN_LENGTH - 1;
  ctx.clearRect(nose, 3, 1, 2);
  rect(ctx, nose - 5, 5, 4, 2, '#1c1f2e');
  px(ctx, nose - 4, 5, '#ffbe45');
  rect(ctx, nose, 9, 1, 2, '#fff6d8');
  rect(lights.ctx, nose, 9, 1, 2, '#ffffff');
  // Tail light at the back.
  rect(ctx, 0, 9, 1, 2, '#ff4a3a');

  return finish(canvas, lights.canvas, '#ffe2a8', createCanvas);
}

/** Car patterns, facing right: b body, B highlight, s shade, g glass, G glint, w tyre, r rim, t tail, h head, a roof lamp. */
const SEDAN = [
  '.........########.........',
  '.......##ggggG#gGg#.......',
  '......#gggggg##gggg##.....',
  '..BBBBBBBBBBBBBBBBBBBBBBB.',
  '.tbbbbbbbbbbbbbbbbbbbbbbbh',
  '.bbbbbbbbbbbbbbbbbbbbbbbbb',
  '.ssswrwssssssssssssswrwss.',
  '....www.............www...',
];

const KEI = [
  '....###########.....',
  '...#gggg#gggGg#.....',
  '..#ggggg#ggggg##....',
  '.BBBBBBBBBBBBBBBBBB.',
  '.tbbbbbbbbbbbbbbbbbh',
  '.bbbbbbbbbbbbbbbbbbb',
  '.sswrwsssssssswrwss.',
  '...www........www...',
];

const CAR_COLORS = {
  sedan: { b: '#4a5288', B: '#6a74b0', s: '#2e3460', '#': '#4a5288' },
  taxi: { b: '#d9a52c', B: '#f2c65a', s: '#9a7420', '#': '#d9a52c' },
  kei: { b: '#dfe3ec', B: '#f4f6fa', s: '#a9afc0', '#': '#dfe3ec' },
} as const;

const SHARED: Record<string, string> = { g: '#24375e', G: '#5a7ab0', w: '#14151f', r: '#5a5e78', t: '#ff3a3a', h: '#fff1c8', a: '#fff2c8' };

export function buildVehicles(createCanvas: CanvasFactory): VehicleArt {
  return {
    sedan: buildCar(SEDAN, CAR_COLORS.sedan, false, createCanvas),
    taxi: buildCar(SEDAN, CAR_COLORS.taxi, true, createCanvas),
    kei: buildCar(KEI, CAR_COLORS.kei, false, createCanvas),
    cyclist: buildCyclist(false, createCanvas),
    cyclistUmbrella: buildCyclist(true, createCanvas),
  };
}

function buildCar(pattern: readonly string[], colors: Record<string, string>, roofLamp: boolean, createCanvas: CanvasFactory): MovingSprite {
  const top = roofLamp ? 2 : 0;
  const w = pattern[0].length;
  const h = pattern.length + top;
  const { canvas, ctx } = createSurface(createCanvas, w, h);
  const lights = createSurface(createCanvas, w + 26, h);
  pattern.forEach((row, y) => {
    [...row].forEach((key, x) => {
      const color = colors[key] ?? SHARED[key];
      if (color) px(ctx, x, y + top, color);
      if (key === 'h') {
        // Headlight beam spreading along the road ahead.
        for (let d = 1; d <= 24; d++) {
          const spread = Math.floor(d / 6);
          lights.ctx.globalAlpha = 1 - d / 26;
          rect(lights.ctx, x + d, y + top - spread, 1, 1 + spread * 2, '#ffffff');
        }
        lights.ctx.globalAlpha = 1;
      }
    });
  });
  if (roofLamp) {
    // The taxi's roof lamp (andon).
    const lampX = Math.floor(w / 2) - 2;
    rect(ctx, lampX, 0, 4, 2, SHARED.a);
    rect(lights.ctx, lampX, 0, 4, 2, '#ffffff');
  }
  return finish(canvas, lights.canvas, '#ffe7b0', createCanvas);
}

function buildCyclist(umbrella: boolean, createCanvas: CanvasFactory): MovingSprite {
  const top = umbrella ? 4 : 0;
  const w = 14;
  const h = 15 + top;
  const { canvas, ctx } = createSurface(createCanvas, w, h);
  const lights = createSurface(createCanvas, w + 14, h);
  const y = top;
  // Wheels, frame, saddle and handlebar.
  for (const cx of [3, 10]) ring(ctx, cx, y + 12);
  line(ctx, 3, y + 12, 6, y + 9, '#c0c4d8');
  line(ctx, 6, y + 9, 9, y + 9, '#c0c4d8');
  line(ctx, 9, y + 9, 10, y + 12, '#c0c4d8');
  hline(ctx, 5, y + 8, 2, '#2a2d44');
  vline(ctx, 9, y + 7, 2, '#8a8fb0');
  px(ctx, 11, y + 8, '#fff1c8');
  for (let d = 1; d <= 12; d++) {
    lights.ctx.globalAlpha = 1 - d / 13;
    px(lights.ctx, 11 + d, y + 8 + Math.floor(d / 5), '#ffffff');
  }
  lights.ctx.globalAlpha = 1;
  px(lights.ctx, 11, y + 8, '#ffffff');
  // Rider: legs on the pedals, coat, an arm on the bar, head.
  line(ctx, 6, y + 8, 7, y + 11, '#2a2d44');
  rect(ctx, 5, y + 3, 3, 5, '#3a4a7a');
  line(ctx, 7, y + 5, 9, y + 7, '#3a4a7a');
  rect(ctx, 5, y + 1, 2, 2, '#e2c4a6');
  hline(ctx, 5, y, 2, '#1a1a22');
  if (umbrella) {
    vline(ctx, 7, 2, y + 2, '#2a2d44');
    hline(ctx, 3, 0, 9, '#c23b3b');
    hline(ctx, 2, 1, 11, '#c23b3b');
    hline(ctx, 2, 2, 11, '#9e2a2a');
    px(ctx, 4, 1, '#e86a5a');
  }
  return finish(canvas, lights.canvas, '#ffe7b0', createCanvas);
}

function ring(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  for (const [dx, dy] of [[-1, -2], [0, -2], [1, -2], [2, -1], [2, 0], [2, 1], [1, 2], [0, 2], [-1, 2], [-2, 1], [-2, 0], [-2, -1]]) {
    px(ctx, cx + dx, cy + dy, '#7c809c');
  }
  px(ctx, cx, cy, '#2a2d44');
}

/**
 * Blur the lights and mirror everything for left-facing travel. The lights
 * canvas can be wider than the sprite (a beam reaching ahead), so the
 * mirrored glow sits further left by that extra width.
 */
function finish(sprite: HTMLCanvasElement, lights: HTMLCanvasElement, color: string, createCanvas: CanvasFactory): MovingSprite {
  const radius = 2;
  const pad = glowOffset(radius);
  const extra = lights.width - sprite.width;
  const glowRight = makeGlow(lights, color, radius, createCanvas);
  return {
    right: sprite,
    left: flip(sprite, createCanvas),
    glowRight,
    glowLeft: flip(glowRight, createCanvas),
    glowAt: { right: { x: -pad, y: -pad }, left: { x: -pad - extra, y: -pad } },
    w: sprite.width,
    h: sprite.height,
  };
}

function flip(source: HTMLCanvasElement, createCanvas: CanvasFactory): HTMLCanvasElement {
  const { canvas, ctx } = createSurface(createCanvas, source.width, source.height);
  ctx.translate(source.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(source, 0, 0);
  return canvas;
}
