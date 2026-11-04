import { createSurface, type CanvasFactory, type Glow } from './canvas';

/**
 * Soft glow sprites. The source's alpha is blurred once (three box-blur
 * passes approximate a Gaussian) and tinted; the result is cached and later
 * drawn upscaled with smoothing on, so glows stay soft while pixels stay crisp.
 */
export function makeGlow(source: HTMLCanvasElement, color: string, radius: number, createCanvas: CanvasFactory): HTMLCanvasElement {
  const pad = radius * 3;
  const w = source.width + pad * 2;
  const h = source.height + pad * 2;
  const { canvas, ctx } = createSurface(createCanvas, w, h);
  ctx.drawImage(source, pad, pad);

  const image = ctx.getImageData(0, 0, w, h);
  const alpha = new Float32Array(w * h);
  for (let i = 0; i < alpha.length; i++) alpha[i] = image.data[i * 4 + 3] / 255;

  const scratch = new Float32Array(w * h);
  for (let pass = 0; pass < 3; pass++) {
    boxBlur(alpha, scratch, w, h, radius, true);
    boxBlur(scratch, alpha, w, h, radius, false);
  }

  const [r, g, b] = hexToRgb(color);
  for (let i = 0; i < alpha.length; i++) {
    image.data[i * 4] = r;
    image.data[i * 4 + 1] = g;
    image.data[i * 4 + 2] = b;
    image.data[i * 4 + 3] = Math.min(255, Math.round(alpha[i] * 255 * 1.6));
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

/** Offset at which to draw a glow made from a source drawn at (x, y). */
export function glowOffset(radius: number): number {
  return radius * 3;
}

/** A glow from any lit shape whose top-left sits at `at` in world space. */
export function shapeGlow(
  at: { x: number; y: number },
  source: HTMLCanvasElement,
  color: string,
  radius: number,
  alpha: number,
  createCanvas: CanvasFactory,
): Glow {
  const canvas = makeGlow(source, color, radius, createCanvas);
  return { canvas, x: at.x - glowOffset(radius), y: at.y - glowOffset(radius), alpha };
}

/** A glow around a lit rectangle whose top-left sits at `at` in world space. */
export function rectGlow(
  at: { x: number; y: number },
  w: number,
  h: number,
  color: string,
  radius: number,
  alpha: number,
  createCanvas: CanvasFactory,
): Glow {
  const { canvas, ctx } = createSurface(createCanvas, w, h);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  return shapeGlow(at, canvas, color, radius, alpha, createCanvas);
}

function boxBlur(src: Float32Array, dst: Float32Array, w: number, h: number, r: number, horizontal: boolean): void {
  const span = r * 2 + 1;
  const outer = horizontal ? h : w;
  const inner = horizontal ? w : h;
  for (let o = 0; o < outer; o++) {
    const at = (i: number) => (horizontal ? o * w + i : i * w + o);
    let sum = 0;
    for (let i = -r; i <= r; i++) sum += src[at(Math.min(inner - 1, Math.max(0, i)))];
    for (let i = 0; i < inner; i++) {
      dst[at(i)] = sum / span;
      sum += src[at(Math.min(inner - 1, i + r + 1))] - src[at(Math.max(0, i - r))];
    }
  }
}

export function hexToRgb(hex: string): [number, number, number] {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}
