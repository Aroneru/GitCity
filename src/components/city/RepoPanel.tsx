import type { ReactNode } from 'react';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { buttonClass } from '@/components/ui/styles';
import type { PlacedBuilding } from '@/lib/city/types';
import { describeBuilding, formatCount, formatDate } from '@/lib/format';
import { NEON } from '@/lib/render/palette';
import type { RepoSnapshot } from '@/lib/snapshot';

interface RepoPanelProps {
  building: PlacedBuilding;
  repo: RepoSnapshot;
  onClose: () => void;
}

/** Details for the selected building: a side card on desktop, a bottom sheet on phones. */
export function RepoPanel({ building, repo, onClose }: RepoPanelProps) {
  return (
    <section
      aria-labelledby="repo-panel-title"
      className="absolute inset-x-2 bottom-2 z-20 max-h-[60%] overflow-y-auto border-2 border-neon-amber bg-night-900/95 p-4 sm:inset-x-auto sm:bottom-auto sm:right-3 sm:top-3 sm:max-h-[calc(100%-5.5rem)] sm:w-80"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 id="repo-panel-title" className="break-all font-pixel text-xs leading-relaxed text-paper">
          {repo.name}
        </h2>
        <button
          type="button"
          aria-label="Close details"
          onClick={onClose}
          className="-m-1 p-2 text-mist hover:text-neon-amber focus-visible:outline-2 focus-visible:outline-neon-cyan"
        >
          <PixelIcon name="close" size={12} />
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {repo.parent && (
          <Badge>
            Fork of{' '}
            <a href={`https://github.com/${repo.parent}`} className="underline underline-offset-2 hover:text-neon-amber">
              {repo.parent}
            </a>
          </Badge>
        )}
        {repo.isArchived && <Badge>Archived</Badge>}
        {building.abandoned && <Badge>Quiet for over a year</Badge>}
      </div>

      {repo.description && <p className="mt-3 text-sm text-mist">{repo.description}</p>}

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <Fact label="Stars">★ {formatCount(repo.stars)}</Fact>
        <Fact label="Language">
          <span aria-hidden="true" className="mr-1.5 inline-block h-2.5 w-2.5" style={{ background: NEON[building.neon].tube }} />
          {repo.language ?? 'None'}
        </Fact>
        <Fact label="Commits">{formatCount(repo.commitCount)}</Fact>
        <Fact label="Last updated">{formatDate(repo.pushedAt)}</Fact>
      </dl>

      <p className="mt-4 border-t-2 border-night-700 pt-3 font-dot text-sm text-neon-amber">{describeBuilding(building)}</p>

      <a href={repo.url} target="_blank" rel="noreferrer" className={`${buttonClass} mt-4 w-full`}>
        Open on GitHub<span className="sr-only"> (opens in a new tab)</span>
      </a>
    </section>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="border border-night-600 px-2 py-0.5 font-dot text-xs text-mist">{children}</span>;
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="font-dot text-xs text-neon-amber">{label}</dt>
      <dd className="text-paper">{children}</dd>
    </div>
  );
}
