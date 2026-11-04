import { GEOMETRY, STREET_DEPTH } from '../city/geometry';
import type { CityLayout } from '../city/types';

/**
 * Camera math for the live view, all pure. The camera stores the world
 * position of the screen's top-left corner and a whole-number scale in
 * device pixels per art pixel, so pixels never blur.
 */

export interface Camera {
  x: number;
  y: number;
  scale: number;
}

/** The canvas size in device pixels. */
export interface Viewport {
  width: number;
  height: number;
  dpr: number;
}

export interface WorldBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** Sky kept above the tallest rooftop. */
export const HEADROOM = 64;
/** How far the camera may wander past either end of the street. */
const PAN_SLACK = 48;
const ZOOM_FACTOR = 1.25;

export function worldBounds(layout: CityLayout): WorldBounds {
  return { left: 0, right: layout.width, top: -(layout.skylineHeight + HEADROOM), bottom: STREET_DEPTH };
}

/** Zoom range: about 1 to 8 CSS pixels per art pixel. */
export function zoomLimits(dpr: number): { min: number; max: number } {
  return { min: Math.max(1, Math.floor(dpr)), max: Math.max(2, Math.round(8 * dpr)) };
}

/** The largest scale at which the whole street, sky to curb, fits the viewport height. */
export function fitScale(viewport: Viewport, bounds: WorldBounds): number {
  const { min, max } = zoomLimits(viewport.dpr);
  return clamp(Math.floor(viewport.height / (bounds.bottom - bounds.top)), min, max);
}

/** The world size the viewport covers at a scale. */
export function viewSize(viewport: Viewport, scale: number): { w: number; h: number } {
  return { w: viewport.width / scale, h: viewport.height / scale };
}

/**
 * Keep the street on screen. A city narrower than the view is centered;
 * when the view is taller than the world, the street sits on the bottom edge.
 */
export function clampCamera(camera: Camera, viewport: Viewport, bounds: WorldBounds): Camera {
  const { w, h } = viewSize(viewport, camera.scale);
  const worldW = bounds.right - bounds.left;
  const worldH = bounds.bottom - bounds.top;
  const x =
    worldW + PAN_SLACK * 2 <= w
      ? bounds.left - (w - worldW) / 2
      : clamp(camera.x, bounds.left - PAN_SLACK, bounds.right + PAN_SLACK - w);
  const y = worldH <= h ? bounds.bottom - h : clamp(camera.y, bounds.top, bounds.bottom - h);
  return { x, y, scale: camera.scale };
}

/** The opening shot: fit the height, centered on `focusX` (usually downtown). */
export function initialCamera(viewport: Viewport, bounds: WorldBounds, focusX: number): Camera {
  const scale = fitScale(viewport, bounds);
  const { w, h } = viewSize(viewport, scale);
  return clampCamera({ x: focusX - w / 2, y: bounds.bottom - h, scale }, viewport, bounds);
}

/** The next scale up or down: at least one step, about 25% at a time. */
export function stepScale(scale: number, steps: number, dpr: number): number {
  const { min, max } = zoomLimits(dpr);
  let next = scale;
  for (let i = 0; i < Math.abs(steps); i++) {
    next = steps > 0 ? Math.max(next + 1, Math.round(next * ZOOM_FACTOR)) : Math.min(next - 1, Math.round(next / ZOOM_FACTOR));
  }
  return clamp(next, min, max);
}

/** Change scale while keeping the world point under (deviceX, deviceY) still. */
export function zoomAt(camera: Camera, scale: number, deviceX: number, deviceY: number): Camera {
  const world = screenToWorld(camera, deviceX, deviceY);
  return { x: world.x - deviceX / scale, y: world.y - deviceY / scale, scale };
}

export function screenToWorld(camera: Camera, deviceX: number, deviceY: number): { x: number; y: number } {
  return { x: camera.x + deviceX / camera.scale, y: camera.y + deviceY / camera.scale };
}

/** Center the view horizontally on a world x. */
export function centerOn(camera: Camera, viewport: Viewport, worldX: number): Camera {
  return { ...camera, x: worldX - viewSize(viewport, camera.scale).w / 2 };
}

/** The x the opening shot centers on: the tallest building, or the middle of the street. */
export function downtownX(layout: CityLayout): number {
  const tallest = layout.buildings.reduce<CityLayout['buildings'][number] | null>(
    (best, b) => (!best || b.height + GEOMETRY.rooftopExtra[b.rooftop] > best.height + GEOMETRY.rooftopExtra[best.rooftop] ? b : best),
    null,
  );
  return tallest ? tallest.x + tallest.width / 2 : layout.width / 2;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
