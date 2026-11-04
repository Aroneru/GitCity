'use client';

import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';
import { createDomCanvas } from '@/lib/render/canvas';
import { CityRenderer } from '@/lib/render/renderer';
import type { Scene } from '@/lib/render/scene';
import { attachControls, type ControlHandlers } from './controls';

export interface CityCanvasHandle {
  zoom: (steps: number) => void;
  resetView: () => void;
  focusBuilding: (index: number) => void;
  focus: () => void;
}

interface CityCanvasProps extends ControlHandlers {
  scene: Scene;
  label: string;
  hovered: number | null;
  selected: number | null;
  /** Building to frame in the opening shot. */
  initialFocus: number | null;
  /** False for visitors who prefer reduced motion: a still city. */
  animate: boolean;
  rain: boolean;
  ref?: Ref<CityCanvasHandle>;
}

/** The interactive city: drag, zoom, hover and select. */
export function CityCanvas({ scene, label, hovered, selected, initialFocus, animate, rain, onHover, onSelect, ref }: CityCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CityRenderer | null>(null);
  const handlers = useRef<ControlHandlers>({ onHover, onSelect });
  const openingFocus = useRef(initialFocus);

  useEffect(() => {
    handlers.current = { onHover, onSelect };
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new CityRenderer(canvas, scene, createDomCanvas);
    rendererRef.current = renderer;
    const fit = () => renderer.resize(canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio || 1, openingFocus.current);
    fit();
    const resizes = new ResizeObserver(fit);
    resizes.observe(canvas);
    // Stop animating while the city is scrolled out of view.
    const visibility = new IntersectionObserver(([entry]) => renderer.setVisible(entry.isIntersecting));
    visibility.observe(canvas);
    const detach = attachControls(canvas, renderer, handlers);
    return () => {
      detach();
      resizes.disconnect();
      visibility.disconnect();
      renderer.destroy();
      rendererRef.current = null;
    };
  }, [scene]);

  useEffect(() => {
    rendererRef.current?.setHighlights(hovered, selected);
  }, [scene, hovered, selected]);

  useEffect(() => {
    rendererRef.current?.setAnimate(animate);
  }, [scene, animate]);

  useEffect(() => {
    rendererRef.current?.setRain(rain);
  }, [scene, rain]);

  useImperativeHandle(
    ref,
    () => ({
      zoom: (steps) => rendererRef.current?.zoom(steps),
      resetView: () => rendererRef.current?.resetView(),
      focusBuilding: (index) => rendererRef.current?.focus(index),
      focus: () => canvasRef.current?.focus({ preventScroll: true }),
    }),
    [],
  );

  return (
    <canvas
      ref={canvasRef}
      tabIndex={0}
      role="img"
      aria-label={label}
      className="pixelated absolute inset-0 block h-full w-full cursor-grab touch-pan-y outline-none focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-neon-cyan"
    />
  );
}
