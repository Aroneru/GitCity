import { describe, expect, it } from 'vitest';
import { clampCamera, fitScale, initialCamera, screenToWorld, stepScale, zoomAt, zoomLimits, type WorldBounds } from './camera';

// A street 2000px long whose sky-to-curb height is 348px.
const bounds: WorldBounds = { left: 0, right: 2000, top: -300, bottom: 48 };
const viewport = { width: 1920, height: 1000, dpr: 1 };

describe('zoomLimits', () => {
  it('spans roughly 1 to 8 CSS pixels per art pixel', () => {
    expect(zoomLimits(1)).toEqual({ min: 1, max: 8 });
    expect(zoomLimits(2)).toEqual({ min: 2, max: 16 });
    expect(zoomLimits(1.25)).toEqual({ min: 1, max: 10 });
  });
});

describe('fitScale', () => {
  it('picks the largest whole scale that fits the street’s height', () => {
    expect(fitScale(viewport, bounds)).toBe(2);
    expect(fitScale({ width: 3840, height: 2000, dpr: 2 }, bounds)).toBe(5);
  });

  it('never goes below the minimum zoom', () => {
    expect(fitScale({ width: 300, height: 100, dpr: 2 }, bounds)).toBe(2);
  });
});

describe('clampCamera', () => {
  it('centers a street narrower than the view', () => {
    const camera = clampCamera({ x: 500, y: 0, scale: 2 }, viewport, { ...bounds, right: 300 });
    expect(camera.x).toBe((300 - 960) / 2);
  });

  it('keeps the street on the bottom edge when the view is taller than the world', () => {
    expect(clampCamera({ x: 0, y: -999, scale: 2 }, viewport, bounds).y).toBe(48 - 500);
  });

  it('stops a little past either end of a long street', () => {
    expect(clampCamera({ x: -500, y: 0, scale: 2 }, viewport, bounds).x).toBe(-48);
    expect(clampCamera({ x: 5000, y: 0, scale: 2 }, viewport, bounds).x).toBe(2000 + 48 - 960);
  });

  it('allows panning up and down only when zoomed in', () => {
    const scale = 6;
    const viewH = 1000 / scale;
    expect(clampCamera({ x: 0, y: -1000, scale }, viewport, bounds).y).toBe(-300);
    expect(clampCamera({ x: 0, y: 1000, scale }, viewport, bounds).y).toBeCloseTo(48 - viewH);
  });
});

describe('zoomAt', () => {
  it('keeps the point under the cursor in place', () => {
    const camera = { x: 120, y: -400, scale: 2 };
    const cursor = { x: 700, y: 333 };
    const before = screenToWorld(camera, cursor.x, cursor.y);
    const zoomed = zoomAt(camera, 5, cursor.x, cursor.y);
    const after = screenToWorld(zoomed, cursor.x, cursor.y);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });
});

describe('stepScale', () => {
  it('moves at least one whole step, about 25% at a time, within the limits', () => {
    expect(stepScale(2, 1, 1)).toBe(3);
    expect(stepScale(10, 1, 2)).toBe(13);
    expect(stepScale(10, -1, 2)).toBe(8);
    expect(stepScale(8, 1, 1)).toBe(8);
    expect(stepScale(1, -1, 1)).toBe(1);
    expect(stepScale(2, 3, 1)).toBe(5);
  });
});

describe('initialCamera', () => {
  it('fits the height and centers on the focus point', () => {
    const camera = initialCamera(viewport, bounds, 1000);
    expect(camera.scale).toBe(2);
    expect(camera.x).toBe(1000 - 480);
    expect(camera.y).toBe(48 - 500);
  });
});
