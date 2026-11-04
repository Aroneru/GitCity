import type { CityRenderer } from '@/lib/render/renderer';

export interface ControlHandlers {
  /** The building under the pointer (null for none), with the pointer in CSS pixels. */
  onHover: (index: number | null, point: { x: number; y: number } | null) => void;
  onSelect: (index: number | null) => void;
}

/** Below this many CSS pixels of movement, a press counts as a click, not a drag. */
const DRAG_THRESHOLD = 4;
/** Wheel distance per zoom step: mouse wheels, and trackpad pinches (ctrl+wheel). */
const WHEEL_STEP = 80;
const PINCH_WHEEL_STEP = 20;
/** Arrow keys pan this many art pixels. */
const KEY_PAN = 40;

/**
 * Wire mouse, touch, trackpad and keyboard input on the city canvas to the
 * renderer: drag to pan (with a fling), click or tap to select, wheel or
 * pinch to zoom, and arrow keys, +/− and 0 for the keyboard.
 * Returns a function that removes every listener.
 */
export function attachControls(
  canvas: HTMLCanvasElement,
  renderer: CityRenderer,
  handlers: { readonly current: ControlHandlers },
): () => void {
  const pointers = new Map<number, { x: number; y: number }>();
  let drag: {
    id: number;
    start: { x: number; y: number };
    last: { x: number; y: number };
    moved: boolean;
    samples: Array<{ t: number; x: number; y: number }>;
  } | null = null;
  let pinch: { distance: number; scale: number } | null = null;
  let wheel = 0;

  const dpr = () => window.devicePixelRatio || 1;
  const local = (event: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };
  const pick = (point: { x: number; y: number }) => renderer.pick(point.x * dpr(), point.y * dpr());
  const pinchGeometry = () => {
    const [a, b] = [...pointers.values()];
    return { distance: Math.hypot(a.x - b.x, a.y - b.y), center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
  };

  function onPointerDown(event: PointerEvent) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    canvas.setPointerCapture(event.pointerId);
    const point = local(event);
    pointers.set(event.pointerId, point);
    renderer.stopMotion();
    if (pointers.size === 1) {
      drag = { id: event.pointerId, start: point, last: point, moved: false, samples: [{ t: event.timeStamp, ...point }] };
    } else if (pointers.size === 2) {
      drag = null;
      pinch = { distance: pinchGeometry().distance, scale: renderer.scale };
    }
  }

  function onPointerMove(event: PointerEvent) {
    const point = local(event);
    if (!pointers.has(event.pointerId)) {
      // A mouse or pen moving without a press: hover.
      if (event.pointerType === 'touch') return;
      const index = pick(point);
      canvas.style.cursor = index === null ? 'grab' : 'pointer';
      handlers.current.onHover(index, index === null ? null : point);
      return;
    }
    pointers.set(event.pointerId, point);

    if (pinch && pointers.size >= 2) {
      const { distance, center } = pinchGeometry();
      if (pinch.distance > 0) renderer.zoomTo(pinch.scale * (distance / pinch.distance), center.x * dpr(), center.y * dpr());
      return;
    }
    if (!drag || drag.id !== event.pointerId) return;
    if (!drag.moved && Math.hypot(point.x - drag.start.x, point.y - drag.start.y) > DRAG_THRESHOLD) {
      drag.moved = true;
      canvas.style.cursor = 'grabbing';
      handlers.current.onHover(null, null);
    }
    if (drag.moved) renderer.panBy((point.x - drag.last.x) * dpr(), (point.y - drag.last.y) * dpr());
    drag.last = point;
    drag.samples.push({ t: event.timeStamp, ...point });
    if (drag.samples.length > 6) drag.samples.shift();
  }

  function onPointerUp(event: PointerEvent) {
    if (drag && drag.id === event.pointerId) {
      const point = local(event);
      if (!drag.moved) {
        handlers.current.onSelect(pick(point));
      } else {
        const velocity = flingVelocity(drag.samples, event.timeStamp);
        renderer.fling(velocity.x * dpr(), velocity.y * dpr());
      }
      canvas.style.cursor = 'grab';
    }
    release(event.pointerId);
  }

  function release(id: number) {
    pointers.delete(id);
    if (pointers.size < 2) pinch = null;
    if (pointers.size === 0) drag = null;
  }

  function onPointerCancel(event: PointerEvent) {
    release(event.pointerId);
  }

  function onPointerLeave() {
    handlers.current.onHover(null, null);
  }

  function onWheel(event: WheelEvent) {
    event.preventDefault();
    const point = local(event);
    // Sideways trackpad swipes and shift+wheel pan; everything else zooms.
    if (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      renderer.panBy(-(event.deltaX || event.deltaY) * dpr(), 0);
      return;
    }
    const step = event.ctrlKey ? PINCH_WHEEL_STEP : WHEEL_STEP;
    wheel += event.deltaMode === WheelEvent.DOM_DELTA_LINE ? event.deltaY * 33 : event.deltaY;
    while (Math.abs(wheel) >= step) {
      const direction = wheel > 0 ? -1 : 1;
      renderer.zoom(direction, point.x * dpr(), point.y * dpr());
      wheel += direction * step;
    }
  }

  function onKeyDown(event: KeyboardEvent) {
    const pan = KEY_PAN * renderer.scale;
    switch (event.key) {
      case 'ArrowLeft':
        renderer.panBy(pan, 0);
        break;
      case 'ArrowRight':
        renderer.panBy(-pan, 0);
        break;
      case 'ArrowUp':
        renderer.panBy(0, pan);
        break;
      case 'ArrowDown':
        renderer.panBy(0, -pan);
        break;
      case '+':
      case '=':
        renderer.zoom(1);
        break;
      case '-':
      case '_':
        renderer.zoom(-1);
        break;
      case '0':
        renderer.resetView();
        break;
      case 'Home':
        renderer.panToEnd('start');
        break;
      case 'End':
        renderer.panToEnd('end');
        break;
      case 'Escape':
        handlers.current.onSelect(null);
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerCancel);
  canvas.addEventListener('pointerleave', onPointerLeave);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('keydown', onKeyDown);
  return () => {
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointercancel', onPointerCancel);
    canvas.removeEventListener('pointerleave', onPointerLeave);
    canvas.removeEventListener('wheel', onWheel);
    canvas.removeEventListener('keydown', onKeyDown);
  };
}

/** Pointer velocity over the last moments of a drag, in CSS pixels per millisecond. */
function flingVelocity(samples: Array<{ t: number; x: number; y: number }>, now: number): { x: number; y: number } {
  const first = samples[0];
  const last = samples[samples.length - 1];
  const dt = last.t - first.t;
  // A pause before release means no fling.
  if (dt <= 0 || now - last.t > 80) return { x: 0, y: 0 };
  return { x: (last.x - first.x) / dt, y: (last.y - first.y) / dt };
}
