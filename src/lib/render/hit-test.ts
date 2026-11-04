import { GEOMETRY } from '../city/geometry';
import type { CityLayout } from '../city/types';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Which building is at a world point? Signs are checked first because they
 * hang in front of their neighbours; then building bodies, including the
 * space their rooftop details occupy. `signs[i]` belongs to `layout.buildings[i]`.
 */
export function hitTest(layout: CityLayout, signs: readonly Rect[], x: number, y: number): number | null {
  for (let i = signs.length - 1; i >= 0; i--) {
    const s = signs[i];
    if (x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.h) return i;
  }
  for (let i = 0; i < layout.buildings.length; i++) {
    const b = layout.buildings[i];
    const top = -(b.height + GEOMETRY.rooftopExtra[b.rooftop]);
    if (x >= b.x && x < b.x + b.width && y >= top && y < 0) return i;
  }
  return null;
}
