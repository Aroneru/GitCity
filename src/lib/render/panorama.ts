import { STREET_DEPTH } from '../city/geometry';
import type { CityLayout } from '../city/types';
import { createSurface, type CanvasFactory, type View } from './canvas';
import { drawGlows, drawScene, type Scene } from './scene';

/** Sky above the tallest rooftop in a full-city view. */
const HEADROOM = 64;

/** The whole street, from the sky above the tallest rooftop down to the near curb. */
export function panoramaView(layout: CityLayout): View {
  const top = -(layout.skylineHeight + HEADROOM);
  return { x: 0, y: top, w: layout.width, h: STREET_DEPTH - top };
}

/**
 * Render the full city at an integer scale: pixel layers at 1×, a
 * nearest-neighbour upscale, then soft glows at the output resolution.
 */
export function renderPanorama(scene: Scene, scale: number, createCanvas: CanvasFactory): HTMLCanvasElement {
  const view = panoramaView(scene.layout);
  const pixels = createSurface(createCanvas, view.w, view.h);
  drawScene(pixels.ctx, scene, view);

  const out = createSurface(createCanvas, view.w * scale, view.h * scale);
  out.ctx.imageSmoothingEnabled = false;
  out.ctx.drawImage(pixels.canvas, 0, 0, view.w * scale, view.h * scale);
  drawGlows(out.ctx, scene, view, scale);
  return out.canvas;
}
