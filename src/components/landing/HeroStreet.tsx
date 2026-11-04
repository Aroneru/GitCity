'use client';

import { useEffect, useRef } from 'react';
import { useCityScene } from '@/hooks/useCityScene';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { createDomCanvas } from '@/lib/render/canvas';
import { createDemoSnapshot } from '@/lib/mock/demo';
import { CityRenderer } from '@/lib/render/renderer';

const DEMO = createDemoSnapshot();
/** Show at least this many art pixels across, zooming in up to 2 CSS pixels per art pixel. */
const MIN_ART_WIDTH = 320;
/** Art pixels per second. */
const DRIFT = 10;

/** The demo city drifting slowly past, along the bottom of the landing page. Decorative. */
export function HeroStreet() {
  const state = useCityScene(DEMO);
  const animate = !useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CityRenderer | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (state.status !== 'ready' || !canvas) return;
    const renderer = new CityRenderer(canvas, state.scene, createDomCanvas);
    rendererRef.current = renderer;
    const fit = () => renderer.resize(canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio || 1);
    fit();
    // Closer than the usual fit-to-height shot on wide screens, keeping the street on the bottom edge.
    const zoom = Math.max(1, Math.min(2, Math.floor(canvas.clientWidth / MIN_ART_WIDTH)));
    renderer.zoomTo(Math.round(zoom * (window.devicePixelRatio || 1)), canvas.width / 2, canvas.height);
    renderer.setDrift(DRIFT);
    const resizes = new ResizeObserver(fit);
    resizes.observe(canvas);
    const visibility = new IntersectionObserver(([entry]) => renderer.setVisible(entry.isIntersecting));
    visibility.observe(canvas);
    return () => {
      resizes.disconnect();
      visibility.disconnect();
      renderer.destroy();
      rendererRef.current = null;
    };
  }, [state]);

  useEffect(() => {
    rendererRef.current?.setAnimate(animate);
  }, [state, animate]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pixelated block h-full w-full transition-opacity duration-1000 motion-reduce:transition-none ${state.status === 'ready' ? 'opacity-100' : 'opacity-0'}`}
    />
  );
}
