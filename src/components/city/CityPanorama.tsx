'use client';

import { useEffect, useRef, useState } from 'react';
import { dotGothic } from '@/app/fonts';
import { generateCity } from '@/lib/city/layout';
import { allSignCharacters } from '@/lib/city/signs';
import { createDomCanvas } from '@/lib/render/canvas';
import { createGlyphAtlas } from '@/lib/render/glyphs';
import { panoramaView, renderPanorama } from '@/lib/render/panorama';
import { buildScene } from '@/lib/render/scene';
import type { CitySnapshot } from '@/lib/snapshot';

type Status = 'building' | 'ready' | 'error';

/**
 * The whole street rendered once into a single canvas at a crisp integer
 * scale, in a strip you scroll sideways.
 */
export function CityPanorama({ snapshot }: { snapshot: CitySnapshot }) {
  const stripRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>('building');

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    let cancelled = false;

    async function draw(target: HTMLDivElement) {
      // Signs are drawn from the webfont, so its Japanese glyphs must be loaded first.
      const family = dotGothic.style.fontFamily;
      await document.fonts.load(`16px ${family}`, allSignCharacters());
      if (cancelled) return;

      const layout = generateCity(snapshot);
      const scene = buildScene(layout, { atlas: createGlyphAtlas(family, createDomCanvas), createCanvas: createDomCanvas });
      const view = panoramaView(layout);
      // The largest whole-pixel scale at which the street fits the rest of the screen.
      const available = window.innerHeight - target.getBoundingClientRect().top - 24;
      const cssScale = Math.min(4, Math.max(1, Math.floor(available / view.h)));
      const dpr = window.devicePixelRatio || 1;
      const canvas = renderPanorama(scene, Math.max(1, Math.round(cssScale * dpr)), createDomCanvas);
      if (cancelled) return;

      canvas.style.width = `${canvas.width / dpr}px`;
      canvas.style.height = `${canvas.height / dpr}px`;
      canvas.className = 'pixelated block max-w-none';
      canvas.setAttribute('role', 'img');
      canvas.setAttribute(
        'aria-label',
        `A pixel-art street at night with ${layout.buildings.length} buildings, one for each of ${snapshot.owner.login}'s repositories.`,
      );
      target.replaceChildren(canvas);
      target.scrollLeft = (target.scrollWidth - target.clientWidth) / 2;
      setStatus('ready');
    }

    draw(strip).catch((error: unknown) => {
      console.error('Failed to draw the city', error);
      if (!cancelled) setStatus('error');
    });
    return () => {
      cancelled = true;
    };
  }, [snapshot]);

  return (
    <section aria-label="City" className="relative border-y-2 border-night-700 bg-night-950">
      <div
        ref={stripRef}
        tabIndex={0}
        className={`flex items-end overflow-x-auto overflow-y-hidden [scrollbar-color:var(--color-night-600)_var(--color-night-900)] focus-visible:outline-2 focus-visible:outline-neon-cyan ${status === 'ready' ? '' : 'min-h-[60vh]'}`}
      />
      {status !== 'ready' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center" role="status">
          {status === 'building' ? (
            <>
              <p className="font-dot text-2xl text-neon-amber motion-safe:animate-pulse">建設中</p>
              <p className="text-sm text-mist">Building the city…</p>
            </>
          ) : (
            <>
              <p className="font-dot text-2xl text-neon-red">停電</p>
              <p className="text-sm text-mist">The city couldn’t be drawn. Try reloading the page.</p>
            </>
          )}
        </div>
      )}
    </section>
  );
}
