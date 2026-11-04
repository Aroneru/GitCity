/**
 * Canvas creation is injected so the renderer runs anywhere a Canvas 2D
 * implementation exists: the browser, or a Node canvas for previews.
 */
export type CanvasFactory = (width: number, height: number) => HTMLCanvasElement;

export const createDomCanvas: CanvasFactory = (width, height) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

/** A canvas and its 2D context, with smoothing off for crisp pixels. */
export interface Surface {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

export function getContext(canvas: HTMLCanvasElement, options?: CanvasRenderingContext2DSettings): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d', options);
  if (!ctx) throw new Error('Canvas 2D is not available');
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

export function createSurface(factory: CanvasFactory, width: number, height: number): Surface {
  const canvas = factory(Math.max(1, Math.ceil(width)), Math.max(1, Math.ceil(height)));
  return { canvas, ctx: getContext(canvas) };
}

/** A pre-rendered image placed in world coordinates (top-left corner). */
export interface Sprite {
  canvas: HTMLCanvasElement;
  x: number;
  y: number;
}

/** A pre-blurred glow composited additively after upscaling. */
export interface Glow extends Sprite {
  alpha: number;
}

/** A rectangle of world space being drawn. */
export interface View {
  x: number;
  y: number;
  w: number;
  h: number;
}
