import type { View } from '../canvas';

/** A horizontally tiling backdrop layer, placed in world y and scrolled with parallax. */
export interface Strip {
  canvas: HTMLCanvasElement;
  /** World y of the tile's top edge. */
  top: number;
  /** 0 = fixed to the screen, 1 = moves with the street. */
  parallax: number;
}

export function drawStrip(ctx: CanvasRenderingContext2D, strip: Strip, view: View, extraOffset = 0): void {
  const tile = strip.canvas.width;
  const offset = mod(Math.round(view.x * strip.parallax + extraOffset), tile);
  const y = Math.round(strip.top - view.y);
  for (let x = -offset; x < view.w; x += tile) ctx.drawImage(strip.canvas, x, y);
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}
