'use client';

import { useState, type ReactNode } from 'react';
import { neonForLanguage } from '@/lib/city/languages';
import type { CityStats } from '@/lib/city/stats';
import { formatCount, storeys } from '@/lib/format';
import { NEON } from '@/lib/render/palette';

interface StatsCardProps {
  stats: CityStats;
  /** Glide to a building by repo name. */
  onFocus: (repoName: string) => void;
}

/** The city in four numbers. Collapsed by default on small screens. */
export function StatsCard({ stats, onFocus }: StatsCardProps) {
  const [open, setOpen] = useState(() => typeof window === 'undefined' || window.matchMedia('(min-width: 640px)').matches);
  const { tallest, topLanguage, oldest } = stats;

  return (
    <section aria-label="City stats" className="absolute left-3 top-3 w-64 max-w-[calc(100%-1.5rem)] border-2 border-night-600 bg-night-900/90">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between px-3 py-2 font-pixel text-[10px] text-neon-cyan focus-visible:outline-2 focus-visible:outline-neon-cyan"
      >
        City stats
        <span aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <dl className="grid gap-2 px-3 pb-3 text-sm">
          <Stat label="Buildings">
            {stats.buildings}
            {stats.totalRepos > stats.buildings && <span className="text-mist"> of {formatCount(stats.totalRepos)} repos</span>}
          </Stat>
          <Stat label="Tallest">
            {tallest ? (
              <>
                <FocusLink name={tallest.name} onFocus={onFocus} />
                <span className="text-mist"> · {storeys(tallest.floors)}</span>
              </>
            ) : (
              '—'
            )}
          </Stat>
          <Stat label="Top language">
            {topLanguage ? (
              <>
                <span aria-hidden="true" className="mr-1.5 inline-block h-2.5 w-2.5" style={{ background: NEON[neonForLanguage(topLanguage.name)].tube }} />
                {topLanguage.name}
                <span className="text-mist">
                  {' '}
                  · {topLanguage.repos} {topLanguage.repos === 1 ? 'repo' : 'repos'}
                </span>
              </>
            ) : (
              '—'
            )}
          </Stat>
          <Stat label="Oldest">
            {oldest ? (
              <>
                <FocusLink name={oldest.name} onFocus={onFocus} />
                <span className="text-mist"> · {new Date(oldest.createdAt).getUTCFullYear()}</span>
              </>
            ) : (
              '—'
            )}
          </Stat>
        </dl>
      )}
    </section>
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="font-dot text-xs text-neon-amber">{label}</dt>
      <dd className="truncate text-paper">{children}</dd>
    </div>
  );
}

function FocusLink({ name, onFocus }: { name: string; onFocus: (name: string) => void }) {
  return (
    <button type="button" onClick={() => onFocus(name)} className="underline decoration-night-600 underline-offset-4 hover:text-neon-amber hover:decoration-neon-amber focus-visible:outline-2 focus-visible:outline-neon-cyan">
      {name}
    </button>
  );
}
