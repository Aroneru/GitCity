/** Pixel-art drawing primitives. All coordinates are whole art pixels. */

type Ctx = CanvasRenderingContext2D;

export function rect(ctx: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  if (w <= 0 || h <= 0) return;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

export function px(ctx: Ctx, x: number, y: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
}

export function hline(ctx: Ctx, x: number, y: number, w: number, color: string): void {
  rect(ctx, x, y, w, 1, color);
}

export function vline(ctx: Ctx, x: number, y: number, h: number, color: string): void {
  rect(ctx, x, y, 1, h, color);
}

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** Ordered-dither threshold for a pixel, in [0, 1). */
export function bayer(x: number, y: number): number {
  return BAYER4[(y & 3) * 4 + (x & 3)] / 16;
}

/** Fill the pixels of a rect whose dither threshold is below `density`. */
export function dither(ctx: Ctx, x: number, y: number, w: number, h: number, color: string, density: number): void {
  if (density <= 0) return;
  if (density >= 1) return rect(ctx, x, y, w, h, color);
  ctx.fillStyle = color;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      if (bayer(x + i, y + j) < density) ctx.fillRect(x + i, y + j, 1, 1);
    }
  }
}

/** A dithered elliptical pool of light, densest at the center. */
export function lightPool(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, color: string, strength: number): void {
  ctx.fillStyle = color;
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
      if (d >= 1) continue;
      if (bayer(x, y) < (1 - d) * strength) ctx.fillRect(x, y, 1, 1);
    }
  }
}

/** Bresenham line. */
export function line(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, color: string): void {
  ctx.fillStyle = color;
  let x = Math.round(x0);
  let y = Math.round(y0);
  const tx = Math.round(x1);
  const ty = Math.round(y1);
  const dx = Math.abs(tx - x);
  const dy = -Math.abs(ty - y);
  const sx = x < tx ? 1 : -1;
  const sy = y < ty ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    ctx.fillRect(x, y, 1, 1);
    if (x === tx && y === ty) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

/** A filled pixel disc. */
export function disc(ctx: Ctx, cx: number, cy: number, r: number, color: string): void {
  ctx.fillStyle = color;
  for (let y = -r; y <= r; y++) {
    const half = Math.floor(Math.sqrt(r * r - y * y + r * 0.8));
    ctx.fillRect(cx - half, cy + y, half * 2 + 1, 1);
  }
}
