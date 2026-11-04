import type { CityLayout } from '../city/types';
import { worldBounds } from './camera';
import { createSurface, type CanvasFactory, type View } from './canvas';
import { STREET_COLORS } from './palette';
import { drawTinyText, fitTinyText } from './pixelfont';
import { drawGlows, drawScene, type Scene } from './scene';

/** The whole street, from the sky above the tallest rooftop down to the near curb. */
export function panoramaView(layout: CityLayout): View {
  const bounds = worldBounds(layout);
  return { x: bounds.left, y: bounds.top, w: bounds.right - bounds.left, h: bounds.bottom - bounds.top };
}

/** Browsers cap canvas sizes (iOS Safari at about 16.7 million pixels); stay under all of them. */
const MAX_SIDE = 16_384;
const MAX_AREA = 16_777_216;

/** The largest whole-number scale, up to `preferred`, that a browser can export at. */
export function chooseExportScale(width: number, height: number, preferred = 4): number {
  const byArea = Math.sqrt(MAX_AREA / (width * height));
  return Math.max(1, Math.floor(Math.min(preferred, MAX_SIDE / width, MAX_SIDE / height, byArea)));
}

export interface PanoramaOptions {
  /** Small pixel-font text in the bottom-left corner. */
  caption?: string;
}

/**
 * Render the full city at an integer scale: pixel layers at 1×, a
 * nearest-neighbour upscale, then soft glows at the output resolution.
 */
export function renderPanorama(
  scene: Scene,
  scale: number,
  createCanvas: CanvasFactory,
  { caption }: PanoramaOptions = {},
): HTMLCanvasElement {
  const view = panoramaView(scene.layout);
  const pixels = createSurface(createCanvas, view.w, view.h);
  drawScene(pixels.ctx, scene, view);
  if (caption) drawTinyText(pixels.ctx, fitTinyText(caption.toUpperCase(), view.w - 8), 4, view.h - 7, STREET_COLORS.lineBright);

  const out = createSurface(createCanvas, view.w * scale, view.h * scale);
  out.ctx.imageSmoothingEnabled = false;
  out.ctx.drawImage(pixels.canvas, 0, 0, view.w * scale, view.h * scale);
  drawGlows(out.ctx, scene, view, scale);
  return out.canvas;
}
