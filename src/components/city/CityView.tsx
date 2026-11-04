'use client';

import { useEffect, useState } from 'react';
import { fetchCity, type CityError } from '@/lib/api';
import type { CitySnapshot } from '@/lib/snapshot';
import { CityExperience } from './CityExperience';
import { CityHeader } from './CityHeader';
import { CityErrorScreen, CityLoading, EmptyLotNote } from './CityStates';

type State = { status: 'loading' } | { status: 'ready'; snapshot: CitySnapshot } | { status: 'error'; error: CityError };

/** Fetches a city through the GitCity API and shows it, or a friendly state. */
export function CityView({ username }: { username: string }) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetchCity(username, controller.signal)
      .then((result) => setState(result.ok ? { status: 'ready', snapshot: result.snapshot } : { status: 'error', error: result.error }))
      .catch(() => {
        // Aborted because the component unmounted or the username changed.
      });
    return () => controller.abort();
  }, [username, attempt]);

  const retry = () => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  };

  if (state.status === 'loading') return <CityLoading username={username} />;
  if (state.status === 'error') return <CityErrorScreen error={state.error} username={username} onRetry={retry} />;

  const { owner, repos, totalRepoCount } = state.snapshot;
  return (
    <>
      <CityHeader
        title={
          <a href={owner.url} className="hover:text-neon-amber">
            @{owner.login}
          </a>
        }
        avatarUrl={owner.avatarUrl}
        details={[owner.name, `${repos.length} ${repos.length === 1 ? 'building' : 'buildings'}`].filter(Boolean).join(' · ')}
      />
      <CityExperience
        snapshot={state.snapshot}
        name={owner.login}
        notice={
          repos.length === 0 ? (
            <EmptyLotNote login={owner.login} />
          ) : totalRepoCount > repos.length ? (
            <p className="px-4 pt-4 text-sm text-mist sm:px-6">
              Showing the {repos.length} most recently pushed of {totalRepoCount.toLocaleString()} public repos.
            </p>
          ) : null
        }
      />
    </>
  );
}
