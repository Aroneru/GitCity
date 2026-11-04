import type { PlacedBuilding } from '@/lib/city/types';
import { formatCount } from '@/lib/format';
import { NEON } from '@/lib/render/palette';
import type { RepoSnapshot } from '@/lib/snapshot';

interface HoverTooltipProps {
  building: PlacedBuilding;
  repo: RepoSnapshot;
  /** Pointer position within the stage, in CSS pixels. */
  x: number;
  y: number;
  stage: { width: number; height: number };
}

const OFFSET = 16;

/** A quick label that follows the mouse; the click panel has the full details. */
export function HoverTooltip({ building, repo, x, y, stage }: HoverTooltipProps) {
  const flipX = x > stage.width - 260;
  const flipY = y > stage.height - 90;
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-10 max-w-64 border-2 border-night-600 bg-night-900/95 px-3 py-2 text-sm"
      style={{
        left: flipX ? undefined : x + OFFSET,
        right: flipX ? stage.width - x + OFFSET : undefined,
        top: flipY ? undefined : y + OFFSET,
        bottom: flipY ? stage.height - y + OFFSET : undefined,
      }}
    >
      <p className="truncate font-dot text-paper">{repo.name}</p>
      <p className="text-mist">
        <span aria-hidden="true" className="mr-1.5 inline-block h-2 w-2" style={{ background: NEON[building.neon].tube }} />
        {repo.language ?? 'No language'} · ★ {formatCount(repo.stars)} · {formatCount(repo.commitCount)} commits
      </p>
    </div>
  );
}
