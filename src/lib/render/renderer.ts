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
import { createSurface, getContext, type CanvasFactory, type Surface, type View } from './canvas';
import { drawFrame, drawFrameGlows, type Actors, type FrameState } from './frame';
import { hitTest, type Rect } from './hit-test';
import type { Lane, VehicleActor } from './layers/effects';
import { MIDGROUND_PARALLAX } from './layers/skyline';
import { reflectionScratch } from './layers/weather';
import { signRects, type Scene } from './scene';
import { TRAIN_LENGTH, type VehicleKind } from './sprites/vehicles';

const FLY_MS = 450;
/** Inertia keeps this share of its speed every 16ms. */
const FRICTION = 0.92;
const SELECTED_COLOR = '#ffbe45';
const HOVER_COLOR = 'rgba(243, 234, 214, 0.75)';
/** Art pixels per second. */
const TRAIN_SPEED = 115;

type Motion =
  | { kind: 'inertia'; vx: number; vy: number; last: number }
  | { kind: 'fly'; fromX: number; toX: number; start: number };

type MovingVehicle = VehicleActor & { speed: number };

/**
 * The live city view. Each frame draws the pixel layers into a small
 * framebuffer at 1 art pixel per pixel, upscales it once by the camera's
 * whole-number scale, then adds glows and selection outlines at full
 * resolution. While animating (and on screen) it runs every frame and
 * schedules the train and passing traffic; otherwise it only redraws when
 * something changes.
 */
export class CityRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly bounds: WorldBounds;
  private readonly signs: Rect[];
  private viewport: Viewport = { width: 0, height: 0, dpr: 1 };
  private camera: Camera | null = null;
  private framebuffer: Surface | null = null;
  private scratch: Surface | null = null;
  private frame = 0;
  private motion: Motion | null = null;
  private hovered: number | null = null;
  private selected: number | null = null;
  private animate = true;
  private visible = true;
  private rain = false;
  private drift: { speed: number; dir: 1 | -1 } | null = null;
  private train: Actors['train'] = null;
  private vehicles: MovingVehicle[] = [];
  private nextTrainAt = 0;
  private nextVehicleAt = 0;
  private lastTime = 0;

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
    const previous = this.viewport;
    this.viewport = { width, height, dpr };
    this.canvas.width = width;
    this.canvas.height = height;

    if (this.camera) {
      // Keep the bottom-center of the view in place: the street is what matters.
      const { min, max } = zoomLimits(dpr);
      const scale = Math.min(max, Math.max(min, this.camera.scale));
      const before = viewSize(previous, this.camera.scale);
      const after = viewSize(this.viewport, scale);
      this.camera = this.clamp({
        scale,
        x: this.camera.x + (before.w - after.w) / 2,
        y: this.camera.y + before.h - after.h,
      });
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

  /** Animation on or off (off for reduced motion): a still city, no glides. */
  setAnimate(animate: boolean): void {
    if (animate === this.animate) return;
    this.animate = animate;
    if (!animate) {
      this.motion = null;
      this.train = null;
      this.vehicles = [];
    }
    this.lastTime = 0;
    this.requestRender();
  }

  /** Pause animation while the canvas is scrolled out of view. */
  setVisible(visible: boolean): void {
    if (visible === this.visible) return;
    this.visible = visible;
    this.lastTime = 0;
    if (visible) this.requestRender();
  }

  setRain(rain: boolean): void {
    if (rain === this.rain) return;
    this.rain = rain;
    this.requestRender();
  }

  /** Slowly pan back and forth on its own (for decorative views), in art pixels per second. */
  setDrift(speed: number): void {
    this.drift = speed > 0 ? { speed, dir: 1 } : null;
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

  /** Glide to a building (instantly when animation is off). */
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
    if (!this.camera || !this.animate || Math.hypot(vx, vy) < 0.05) return;
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

  private get running(): boolean {
    return this.animate && this.visible;
  }

  private readonly tick = (now: number): void => {
    this.frame = 0;
    if (!this.camera) return;
    const seconds = now / 1000;
    const dt = this.lastTime ? Math.min(0.1, seconds - this.lastTime) : 0;
    this.lastTime = seconds;
    if (this.motion) this.advance(now);
    if (this.running) this.advanceWorld(seconds, dt);
    this.draw(seconds);
    if (this.motion || this.running) this.requestRender();
  };

  private flyTo(worldX: number): void {
    if (!this.camera) return;
    const target = this.clamp(centerOn(this.camera, this.viewport, worldX));
    if (!this.animate) {
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

  /** Move the train, the traffic and any drift, and schedule what comes next. */
  private advanceWorld(t: number, dt: number): void {
    const view = this.view();
    if (!view) return;
    if (this.nextTrainAt === 0) {
      this.nextTrainAt = t + 4;
      this.nextVehicleAt = t + 1.5;
    }

    if (this.drift && !this.motion && this.camera) {
      const before = this.camera.x;
      this.camera = this.clamp({ ...this.camera, x: before + this.drift.dir * this.drift.speed * dt });
      if (dt > 0 && this.camera.x === before) this.drift.dir = this.drift.dir === 1 ? -1 : 1;
    }

    // The train, in the midground's parallax coordinates.
    const left = Math.round(view.x * MIDGROUND_PARALLAX);
    if (this.train) {
      this.train.x += this.train.dir * TRAIN_SPEED * dt;
      const gone = this.train.dir === 1 ? this.train.x > left + view.w + 40 : this.train.x + TRAIN_LENGTH < left - 40;
      if (gone) {
        this.train = null;
        this.nextTrainAt = t + 18 + Math.random() * 20;
      }
    } else if (t >= this.nextTrainAt) {
      const dir = Math.random() < 0.5 ? 1 : -1;
      this.train = { dir, x: dir === 1 ? left - TRAIN_LENGTH - 10 : left + view.w + 10 };
    }

    // Traffic, entering just off screen.
    for (const vehicle of this.vehicles) vehicle.x += vehicle.dir * vehicle.speed * dt;
    this.vehicles = this.vehicles.filter((v) => v.x < view.x + view.w + 80 && v.x > view.x - 80);
    if (t >= this.nextVehicleAt) {
      this.vehicles.push(this.spawnVehicle(view));
      this.nextVehicleAt = t + 4 + Math.random() * 9;
    }
  }

  private spawnVehicle(view: View): MovingVehicle {
    const roll = Math.random();
    const kind: VehicleKind = roll < 0.4 ? 'sedan' : roll < 0.6 ? 'taxi' : roll < 0.78 ? 'kei' : 'cyclist';
    const lane: Lane = kind === 'cyclist' ? 'edge' : Math.random() < 0.5 ? 'far' : 'near';
    const dir = lane === 'far' ? 1 : lane === 'near' ? -1 : Math.random() < 0.5 ? 1 : -1;
    const speed = kind === 'cyclist' ? 22 + Math.random() * 10 : 60 + Math.random() * 35;
    const width = this.scene.vehicles[kind].w;
    return { kind, lane, dir, speed, x: dir === 1 ? view.x - width - 4 : view.x + view.w + 4 };
  }

  private view(): View | null {
    const camera = this.camera;
    if (!camera) return null;
    return {
      x: Math.round(camera.x),
      y: Math.round(camera.y),
      w: Math.ceil(this.viewport.width / camera.scale),
      h: Math.ceil(this.viewport.height / camera.scale),
    };
  }

  private draw(seconds: number): void {
    const camera = this.camera;
    // Snapped to whole art pixels so every layer stays on the pixel grid.
    const view = this.view();
    if (!camera || !view) return;
    const scale = camera.scale;
    if (!this.framebuffer || this.framebuffer.canvas.width !== view.w || this.framebuffer.canvas.height !== view.h) {
      this.framebuffer = createSurface(this.createCanvas, view.w, view.h);
    }
    if (this.rain) this.scratch = reflectionScratch(this.scratch, view, this.createCanvas);
    const frame: FrameState = { time: this.animate ? seconds : 0, animate: this.animate, rain: this.rain };
    const actors: Actors = { train: this.train, vehicles: this.vehicles };
    drawFrame(this.framebuffer, this.scene, view, frame, actors, this.rain ? this.scratch : null);

    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.framebuffer.canvas, 0, 0, view.w * scale, view.h * scale);
    drawFrameGlows(ctx, this.scene, view, scale, frame, actors);
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
