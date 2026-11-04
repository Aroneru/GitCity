import {
  centerOn,
  clampCamera,
  downtownX,
  initialCamera,
  screenToWorld,
  stepScale,
  viewSize,
  worldBounds,
  zoomAt,
  zoomLimits,
  type Camera,
  type Viewport,
  type WorldBounds,
} from './camera';
import { createSurface, getContext, type CanvasFactory, type Surface } from './canvas';
import { hitTest, type Rect } from './hit-test';
import { drawGlows, drawScene, signRects, type Scene } from './scene';

const FLY_MS = 450;
/** Inertia keeps this share of its speed every 16ms. */
const FRICTION = 0.92;
const SELECTED_COLOR = '#ffbe45';
const HOVER_COLOR = 'rgba(243, 234, 214, 0.75)';

type Motion =
  | { kind: 'inertia'; vx: number; vy: number; last: number }
  | { kind: 'fly'; fromX: number; toX: number; start: number };

/**
 * The live city view. Each frame draws the scene's pixel layers into a
 * small framebuffer at 1 art pixel per pixel, upscales it once by the
 * camera's whole-number scale, then adds glows and selection outlines at
 * full resolution. Frames are only drawn when something changes.
 */
export class CityRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly bounds: WorldBounds;
  private readonly signs: Rect[];
  private viewport: Viewport = { width: 0, height: 0, dpr: 1 };
  private camera: Camera | null = null;
  private framebuffer: Surface | null = null;
  private frame = 0;
  private motion: Motion | null = null;
  private hovered: number | null = null;
  private selected: number | null = null;
  reducedMotion = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly scene: Scene,
    private readonly createCanvas: CanvasFactory,
  ) {
    this.ctx = getContext(canvas);
    this.bounds = worldBounds(scene.layout);
    this.signs = signRects(scene);
  }

  get scale(): number {
    return this.camera?.scale ?? 1;
  }

  /** Match the canvas to its CSS size; the first call frames the opening shot. */
  resize(cssWidth: number, cssHeight: number, dpr: number, focus: number | null = null): void {
    const width = Math.max(1, Math.round(cssWidth * dpr));
    const height = Math.max(1, Math.round(cssHeight * dpr));
    if (this.camera && width === this.viewport.width && height === this.viewport.height && dpr === this.viewport.dpr) return;
    this.viewport = { width, height, dpr };
    this.canvas.width = width;
    this.canvas.height = height;

    if (this.camera) {
      const { min, max } = zoomLimits(dpr);
      this.camera = this.clamp({ ...this.camera, scale: Math.min(max, Math.max(min, this.camera.scale)) });
    } else {
      const building = focus === null ? null : this.scene.layout.buildings[focus];
      const focusX = building ? building.x + building.width / 2 : downtownX(this.scene.layout);
      this.camera = initialCamera(this.viewport, this.bounds, focusX);
    }
    this.requestRender();
  }

  setHighlights(hovered: number | null, selected: number | null): void {
    if (hovered === this.hovered && selected === this.selected) return;
    this.hovered = hovered;
    this.selected = selected;
    this.requestRender();
  }

  /** Move the view as if dragged by (dx, dy) device pixels. */
  panBy(dx: number, dy: number): void {
    if (!this.camera) return;
    this.motion = null;
    this.camera = this.clamp({ ...this.camera, x: this.camera.x - dx / this.camera.scale, y: this.camera.y - dy / this.camera.scale });
    this.requestRender();
  }

  /** Zoom in (+) or out (−) by steps, around a device point (default: the view's center). */
  zoom(steps: number, deviceX = this.viewport.width / 2, deviceY = this.viewport.height / 2): void {
    if (!this.camera) return;
    this.zoomTo(stepScale(this.camera.scale, steps, this.viewport.dpr), deviceX, deviceY);
  }

  zoomTo(scale: number, deviceX: number, deviceY: number): void {
    if (!this.camera) return;
    const { min, max } = zoomLimits(this.viewport.dpr);
    const next = Math.min(max, Math.max(min, Math.round(scale)));
    if (next === this.camera.scale) return;
    this.motion = null;
    this.camera = this.clamp(zoomAt(this.camera, next, deviceX, deviceY));
    this.requestRender();
  }

  resetView(): void {
    if (!this.camera) return;
    this.motion = null;
    this.camera = initialCamera(this.viewport, this.bounds, downtownX(this.scene.layout));
    this.requestRender();
  }

  /** Glide to a building (instantly when the visitor prefers reduced motion). */
  focus(index: number): void {
    const building = this.scene.layout.buildings[index];
    if (!building || !this.camera) return;
    this.flyTo(building.x + building.width / 2);
  }

  /** Glide to either end of the street. */
  panToEnd(end: 'start' | 'end'): void {
    if (!this.camera) return;
    const { w } = viewSize(this.viewport, this.camera.scale);
    this.flyTo(end === 'start' ? this.bounds.left + w / 2 : this.bounds.right - w / 2);
  }

  /** Keep drifting after a drag, at a velocity in device pixels per millisecond. */
  fling(vx: number, vy: number): void {
    if (!this.camera || this.reducedMotion || Math.hypot(vx, vy) < 0.05) return;
    this.motion = { kind: 'inertia', vx: vx / this.camera.scale, vy: vy / this.camera.scale, last: performance.now() };
    this.requestRender();
  }

  stopMotion(): void {
    this.motion = null;
  }

  /** The building under a device point, if any. */
  pick(deviceX: number, deviceY: number): number | null {
    if (!this.camera) return null;
    const view = { x: Math.round(this.camera.x), y: Math.round(this.camera.y) };
    const world = screenToWorld({ ...view, scale: this.camera.scale }, deviceX, deviceY);
    return hitTest(this.scene.layout, this.signs, world.x, world.y);
  }

  requestRender(): void {
    if (this.frame === 0) this.frame = requestAnimationFrame(this.tick);
  }

  destroy(): void {
    if (this.frame !== 0) cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.motion = null;
  }

  private readonly tick = (now: number): void => {
    this.frame = 0;
    if (!this.camera) return;
    if (this.motion) this.advance(now);
    this.draw();
    if (this.motion) this.requestRender();
  };

  private flyTo(worldX: number): void {
    if (!this.camera) return;
    const target = this.clamp(centerOn(this.camera, this.viewport, worldX));
    if (this.reducedMotion) {
      this.motion = null;
      this.camera = target;
    } else {
      this.motion = { kind: 'fly', fromX: this.camera.x, toX: target.x, start: performance.now() };
    }
    this.requestRender();
  }

  private advance(now: number): void {
    const motion = this.motion;
    const camera = this.camera;
    if (!motion || !camera) return;
    if (motion.kind === 'fly') {
      const t = Math.min(1, Math.max(0, (now - motion.start) / FLY_MS));
      const eased = 1 - (1 - t) ** 3;
      this.camera = this.clamp({ ...camera, x: motion.fromX + (motion.toX - motion.fromX) * eased });
      if (t >= 1) this.motion = null;
      return;
    }
    const dt = Math.min(64, Math.max(0, now - motion.last));
    motion.last = now;
    const moved = this.clamp({ ...camera, x: camera.x - motion.vx * dt, y: camera.y - motion.vy * dt });
    const decay = FRICTION ** (dt / 16);
    motion.vx *= decay;
    motion.vy *= decay;
    const stuck = moved.x === camera.x && moved.y === camera.y;
    this.camera = moved;
    if (stuck || Math.hypot(motion.vx, motion.vy) < 0.002) this.motion = null;
  }

  private draw(): void {
    const camera = this.camera;
    if (!camera) return;
    const scale = camera.scale;
    const w = Math.ceil(this.viewport.width / scale);
    const h = Math.ceil(this.viewport.height / scale);
    if (!this.framebuffer || this.framebuffer.canvas.width !== w || this.framebuffer.canvas.height !== h) {
      this.framebuffer = createSurface(this.createCanvas, w, h);
    }
    // Snap the camera to whole art pixels so every layer stays on the pixel grid.
    const view = { x: Math.round(camera.x), y: Math.round(camera.y), w, h };
    drawScene(this.framebuffer.ctx, this.scene, view);

    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.framebuffer.canvas, 0, 0, w * scale, h * scale);
    drawGlows(ctx, this.scene, view, scale);
    this.outline(this.selected, view, scale, SELECTED_COLOR);
    if (this.hovered !== this.selected) this.outline(this.hovered, view, scale, HOVER_COLOR);
  }

  private outline(index: number | null, view: { x: number; y: number }, scale: number, color: string): void {
    const building = index === null ? undefined : this.scene.layout.buildings[index];
    if (!building) return;
    const x = (building.x - view.x) * scale;
    const y = (-building.height - view.y) * scale;
    const w = building.width * scale;
    const h = building.height * scale;
    const t = Math.max(2, Math.floor(scale / 2));
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.fillRect(x - t, y - t, w + t * 2, t);
    ctx.fillRect(x - t, y + h, w + t * 2, t);
    ctx.fillRect(x - t, y, t, h);
    ctx.fillRect(x + w, y, t, h);
  }

  private clamp(camera: Camera): Camera {
    return clampCamera(camera, this.viewport, this.bounds);
  }
}
