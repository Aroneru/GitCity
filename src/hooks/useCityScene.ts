'use client';

import { useEffect, useState } from 'react';
import { dotGothic } from '@/app/fonts';
import { generateCity } from '@/lib/city/layout';
import { allSignCharacters } from '@/lib/city/signs';
import { createDomCanvas } from '@/lib/render/canvas';
import { createGlyphAtlas } from '@/lib/render/glyphs';
import { buildScene, type Scene } from '@/lib/render/scene';
import type { CitySnapshot } from '@/lib/snapshot';

export type SceneState = { status: 'building' } | { status: 'ready'; scene: Scene } | { status: 'error' };

/** Generate the city and bake its sprites, once the sign font is loaded. */
export function useCityScene(snapshot: CitySnapshot): SceneState {
  const [state, setState] = useState<SceneState>({ status: 'building' });

  useEffect(() => {
    let cancelled = false;
    async function build() {
      // Signs are drawn from the webfont, so its Japanese glyphs must be loaded first.
      const family = dotGothic.style.fontFamily;
      await document.fonts.load(`16px ${family}`, allSignCharacters());
      if (cancelled) return;
      const layout = generateCity(snapshot);
      const scene = buildScene(layout, { atlas: createGlyphAtlas(family, createDomCanvas), createCanvas: createDomCanvas });
      if (!cancelled) setState({ status: 'ready', scene });
    }
    build().catch((error: unknown) => {
      console.error('Failed to build the city', error);
      if (!cancelled) setState({ status: 'error' });
    });
    return () => {
      cancelled = true;
    };
  }, [snapshot]);

  return state;
}
