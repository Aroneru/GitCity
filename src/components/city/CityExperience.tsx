'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useCityScene } from '@/hooks/useCityScene';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { computeStats } from '@/lib/city/stats';
import { createDomCanvas } from '@/lib/render/canvas';
import { chooseExportScale, panoramaView, renderPanorama } from '@/lib/render/panorama';
import type { CitySnapshot } from '@/lib/snapshot';
import { BuildingDirectory } from './BuildingDirectory';
import { CityCanvas, type CityCanvasHandle } from './CityCanvas';
import { CityToolbar } from './CityToolbar';
import { HoverTooltip } from './HoverTooltip';
import { RepoPanel } from './RepoPanel';
import { RuleLegend } from './RuleLegend';
import { StatsCard } from './StatsCard';

interface CityExperienceProps {
  snapshot: CitySnapshot;
  /** Names the exported PNG, e.g. a login. */
  name: string;
  /** Shown just below the city, e.g. "showing 100 of 240 repos". */
  notice?: ReactNode;
}

type Hover = { index: number; x: number; y: number; stage: { width: number; height: number } };

/**
 * The interactive city with its overlays: stats, details panel, tooltip,
 * toolbar (zoom, rain, share, PNG export), and a directory of every
 * building. The selected building and the rain are mirrored in the URL
 * (`?repo=name&rain=1`) so a shared link opens the same way.
 */
export function CityExperience({ snapshot, name, notice }: CityExperienceProps) {
  const sceneState = useCityScene(snapshot);
  const reducedMotion = useReducedMotion();
  const stats = useMemo(() => computeStats(snapshot), [snapshot]);
  const repos = useMemo(() => new Map(snapshot.repos.map((repo) => [repo.name, repo])), [snapshot]);
  const [selectedName, setSelectedName] = useState<string | null>(() => readParam('repo'));
  const [rain, setRain] = useState(() => readParam('rain') === '1');
  const [hover, setHover] = useState<Hover | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const canvasRef = useRef<CityCanvasHandle>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const messageTimer = useRef<number | undefined>(undefined);

  const scene = sceneState.status === 'ready' ? sceneState.scene : null;
  const buildings = useMemo(() => scene?.layout.buildings ?? [], [scene]);
  const selectedIndex = selectedName === null ? -1 : buildings.findIndex((b) => b.id === selectedName);
  const selected = selectedIndex >= 0 ? selectedIndex : null;

  const select = useCallback(
    (index: number | null, focus = false) => {
      const repoName = index === null ? null : (buildings[index]?.id ?? null);
      setSelectedName(repoName);
      writeParam('repo', repoName);
      if (index !== null && focus) canvasRef.current?.focusBuilding(index);
    },
    [buildings],
  );

  const onHover = useCallback((index: number | null, point: { x: number; y: number } | null) => {
    const stage = stageRef.current;
    setHover(
      index === null || point === null || !stage
        ? null
        : { index, ...point, stage: { width: stage.clientWidth, height: stage.clientHeight } },
    );
  }, []);

  const flash = (text: string) => {
    setMessage(text);
    window.clearTimeout(messageTimer.current);
    messageTimer.current = window.setTimeout(() => setMessage(null), 2500);
  };

  useEffect(() => () => window.clearTimeout(messageTimer.current), []);

  // Escape closes the details panel from anywhere on the page.
  useEffect(() => {
    if (selected === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') select(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selected, select]);

  const toggleRain = () => {
    const next = !rain;
    setRain(next);
    writeParam('rain', next ? '1' : null);
  };

  const share = async () => {
    const url = window.location.href;
    if (typeof navigator.share === 'function' && window.matchMedia('(pointer: coarse)').matches) {
      await navigator.share({ title: document.title, url }).catch(() => {});
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      flash('Link copied');
    } catch {
      flash('Couldn’t copy. The link is in the address bar.');
    }
  };

  const exportPng = async () => {
    if (!scene || exporting) return;
    setExporting(true);
    try {
      // Let the button show its busy state before the heavy render.
      await new Promise((resolve) => setTimeout(resolve, 0));
      const view = panoramaView(scene.layout);
      const canvas = renderPanorama(scene, chooseExportScale(view.w, view.h), createDomCanvas, { caption: `gitcity / ${name}`, rain });
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('PNG encoding failed');
      downloadBlob(blob, `gitcity-${name}.png`);
      flash('Saved the whole street as a PNG');
    } catch (error) {
      console.error('PNG export failed', error);
      flash('Couldn’t save the image.');
    } finally {
      setExporting(false);
    }
  };

  const focusByName = (repoName: string) => {
    const index = buildings.findIndex((b) => b.id === repoName);
    if (index >= 0) select(index, true);
  };

  const hovered = hover && buildings[hover.index] ? hover : null;

  return (
    <>
      <div ref={stageRef} className="relative h-[max(420px,calc(100dvh-7rem))] overflow-hidden border-y-2 border-night-700 bg-night-950">
        {scene ? (
          <>
            <CityCanvas
              ref={canvasRef}
              scene={scene}
              label={`A pixel-art street at night with ${buildings.length} buildings, one for each of ${snapshot.owner.login}'s repositories. The building directory below lists them all.`}
              hovered={hovered?.index ?? null}
              selected={selected}
              initialFocus={selected}
              animate={!reducedMotion}
              rain={rain}
              onHover={onHover}
              onSelect={select}
            />
            <StatsCard stats={stats} onFocus={focusByName} />
            {selected !== null && repos.get(buildings[selected].id) && (
              <RepoPanel building={buildings[selected]} repo={repos.get(buildings[selected].id)!} onClose={() => select(null)} />
            )}
            {hovered && hovered.index !== selected && repos.get(buildings[hovered.index].id) && (
              <HoverTooltip
                building={buildings[hovered.index]}
                repo={repos.get(buildings[hovered.index].id)!}
                x={hovered.x}
                y={hovered.y}
                stage={hovered.stage}
              />
            )}
            <CityToolbar
              onZoomIn={() => canvasRef.current?.zoom(1)}
              onZoomOut={() => canvasRef.current?.zoom(-1)}
              onReset={() => canvasRef.current?.resetView()}
              onShare={share}
              onExport={exportPng}
              onToggleRain={toggleRain}
              rain={rain}
              exporting={exporting}
              message={message}
            />
          </>
        ) : (
          <SceneStatus failed={sceneState.status === 'error'} />
        )}
      </div>
      {notice}
      <BuildingDirectory
        buildings={buildings}
        repos={repos}
        selected={selected}
        onSelect={(index) => {
          select(index, true);
          stageRef.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'nearest' });
        }}
      />
      <RuleLegend />
    </>
  );
}

function SceneStatus({ failed }: { failed: boolean }) {
  return (
    <div role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
      {failed ? (
        <>
          <p className="font-dot text-2xl text-neon-red">停電</p>
          <p className="text-sm text-mist">The city couldn’t be drawn. Try reloading the page.</p>
        </>
      ) : (
        <>
          <p className="font-dot text-2xl text-neon-amber motion-safe:animate-pulse">建設中</p>
          <p className="text-sm text-mist">Building the city…</p>
        </>
      )}
    </div>
  );
}

function readParam(name: string): string | null {
  return typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get(name);
}

/** Mirror view state in the URL, so a shared link opens the same way. */
function writeParam(name: string, value: string | null): void {
  const url = new URL(window.location.href);
  if (value) url.searchParams.set(name, value);
  else url.searchParams.delete(name);
  window.history.replaceState(window.history.state, '', url);
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
