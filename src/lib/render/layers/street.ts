import { STREET, STREET_DEPTH } from '../../city/geometry';
import type { CityLayout } from '../../city/types';
import { createSurface, type CanvasFactory, type Sprite, type View } from '../canvas';
import { dither, hline, lightPool, px, rect, vline } from '../draw';
import { STREET_COLORS as C } from '../palette';

/**
 * The street layer (parallax 1): far sidewalk, road with markings and
 * crosswalks, near sidewalk, pools of light from shops, and the mouths of
 * side streets at each crossing.
 */

/** How far the street extends past the city on both ends (wide screens zoomed out see it). */
export const STREET_PAD = 1024;

export interface LightPool {
  /** Center x in world pixels. */
  x: number;
  /** Half-width of the pool. */
  radius: number;
  tone: 'warm' | 'cool';
  strength: number;
}

export interface StreetArt {
  /** Covers [-STREET_PAD, width + STREET_PAD] × [0, STREET_DEPTH]. */
  canvas: HTMLCanvasElement;
  left: number;
  /** Side streets receding between the buildings, drawn behind them. */
  sideStreets: Sprite[];
}

const ROAD_TOP = STREET.sidewalk;
const ROAD_BOTTOM = STREET.sidewalk + STREET.road;

export function buildStreet(layout: CityLayout, pools: LightPool[], createCanvas: CanvasFactory): StreetArt {
  const left = -STREET_PAD;
  const width = layout.width + STREET_PAD * 2;
  const { canvas, ctx } = createSurface(createCanvas, width, STREET_DEPTH);

  // Far sidewalk: offset paving slabs, darker where it meets the buildings.
  rect(ctx, 0, 0, width, STREET.sidewalk, C.sidewalk);
  hline(ctx, 0, 0, width, C.joint);
  hline(ctx, 0, 4, width, C.joint);
  for (let x = 0; x < width; x += 12) {
    vline(ctx, x, 1, 3, C.joint);
    vline(ctx, x + 6, 5, 3, C.joint);
  }
  hline(ctx, 0, STREET.sidewalk - 2, width, C.curb);
  hline(ctx, 0, STREET.sidewalk - 1, width, C.curbShade);

  // Road with a little grain, edge lines and a dashed center line.
  rect(ctx, 0, ROAD_TOP, width, STREET.road, C.road);
  dither(ctx, 0, ROAD_TOP, width, STREET.road, C.roadGrain, 0.1);
  hline(ctx, 0, ROAD_TOP + 2, width, C.line);
  hline(ctx, 0, ROAD_BOTTOM - 3, width, C.line);
  for (let x = 0; x < width; x += 16) hline(ctx, x, ROAD_TOP + 14, 8, C.lineBright);

  // Near sidewalk, seen from just above.
  hline(ctx, 0, ROAD_BOTTOM, width, C.curbShade);
  hline(ctx, 0, ROAD_BOTTOM + 1, width, C.curb);
  rect(ctx, 0, ROAD_BOTTOM + 2, width, STREET.nearSidewalk - 2, C.sidewalk);
  for (let x = 0; x < width; x += 16) vline(ctx, x, ROAD_BOTTOM + 2, STREET.nearSidewalk - 2, C.joint);

  for (const pool of pools) {
    const cx = pool.x - left;
    const [color, hi] = pool.tone === 'warm' ? [C.poolWarm, C.poolWarmHi] : [C.poolCool, C.poolCoolHi];
    lightPool(ctx, cx, 2, pool.radius, 10, color, pool.strength);
    lightPool(ctx, cx, 1, pool.radius * 0.55, 5, hi, pool.strength * 0.8);
  }

  const sideStreets: Sprite[] = [];
  for (const crossing of layout.crossings) {
    const x = crossing.x - left;
    // The side street cuts through the far sidewalk, with curb ramps.
    rect(ctx, x + 3, 0, crossing.width - 6, STREET.sidewalk, C.road);
    dither(ctx, x + 3, 0, crossing.width - 6, STREET.sidewalk, C.roadGrain, 0.1);
    vline(ctx, x + 2, 0, STREET.sidewalk, C.curb);
    vline(ctx, x + crossing.width - 3, 0, STREET.sidewalk, C.curb);
    // Zebra crossing over the main road.
    for (let y = ROAD_TOP + 3; y < ROAD_BOTTOM - 3; y += 4) {
      rect(ctx, x + 7, y, crossing.width - 14, 2, C.crosswalk);
      dither(ctx, x + 7, y, crossing.width - 14, 2, C.crosswalkWorn, 0.2);
    }
    sideStreets.push(buildSideStreet(crossing.x, crossing.width, createCanvas));
  }

  return { canvas, left, sideStreets };
}

export function drawStreet(ctx: CanvasRenderingContext2D, street: StreetArt, view: View): void {
  ctx.drawImage(street.canvas, Math.round(street.left - view.x), Math.round(-view.y));
}

/** A side street receding toward the midground, as a narrowing wedge of road. */
function buildSideStreet(worldX: number, width: number, createCanvas: CanvasFactory): Sprite {
  const depth = 14;
  const { canvas, ctx } = createSurface(createCanvas, width, depth);
  for (let row = 0; row < depth; row++) {
    const t = (row + 1) / depth; // 0 far … 1 near
    const half = Math.round((width / 2 - 3) * (0.45 + 0.55 * t));
    const x0 = Math.round(width / 2) - half;
    rect(ctx, x0, row, half * 2, 1, C.sideStreet);
    px(ctx, x0, row, C.joint);
    px(ctx, x0 + half * 2 - 1, row, C.joint);
    if (row % 4 < 2) px(ctx, Math.round(width / 2), row, C.line);
  }
  return { canvas, x: worldX, y: -depth };
}
