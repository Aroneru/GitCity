import type { PlacedBuilding } from '@/lib/city/types';
import { formatCount, kindLabel } from '@/lib/format';
import type { RepoSnapshot } from '@/lib/snapshot';

interface BuildingDirectoryProps {
  buildings: readonly PlacedBuilding[];
  repos: ReadonlyMap<string, RepoSnapshot>;
  selected: number | null;
  onSelect: (index: number) => void;
}

/** Every building in street order: a keyboard and screen-reader way around the city. */
export function BuildingDirectory({ buildings, repos, selected, onSelect }: BuildingDirectoryProps) {
  if (buildings.length === 0) return null;
  return (
    <section aria-labelledby="directory-heading" className="px-4 pt-8 sm:px-6">
      <h2 id="directory-heading" className="mb-4 font-pixel text-xs text-neon-cyan">
        Building directory
      </h2>
      <ol className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
        {buildings.map((building, index) => (
          <li key={building.id}>
            <button
              type="button"
              aria-pressed={selected === index}
              onClick={() => onSelect(index)}
              className="flex w-full items-baseline justify-between gap-3 border-2 border-transparent px-2 py-1.5 text-left hover:border-night-600 focus-visible:outline-2 focus-visible:outline-neon-cyan aria-pressed:border-neon-amber"
            >
              <span className="truncate font-dot text-paper">{building.id}</span>
              <span className="shrink-0 text-xs text-mist">
                {kindLabel(building.kind)} · {building.floors}F · ★ {formatCount(repos.get(building.id)?.stars ?? 0)}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
