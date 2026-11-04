import Link from 'next/link';
import type { CityError } from '@/lib/api';
import { StatusScreen } from '@/components/ui/StatusScreen';
import { buttonClass } from '@/components/ui/styles';
import { ExampleCities } from './ExampleCities';

/** Friendly states around the city: loading, errors, and an empty lot. */

export function CityLoading({ username }: { username?: string }) {
  return (
    <StatusScreen live pulse sign="建設中" tone="amber" title={username ? `Building @${username}’s city` : 'Building the city'}>
      Counting commits and switching on the lights…
    </StatusScreen>
  );
}

export function CityErrorScreen({ error, username, onRetry }: { error: CityError; username: string; onRetry: () => void }) {
  const home = (
    <Link href="/" className={buttonClass}>
      Back to the start
    </Link>
  );
  const retry = (
    <button type="button" onClick={onRetry} className={buttonClass}>
      Try again
    </button>
  );

  switch (error.code) {
    case 'not_found':
      return (
        <StatusScreen sign="見つかりません" tone="pink" title={`No one lives at @${username}`} actions={<ExampleCities />}>
          There’s no GitHub user or organization with that name. Check the spelling, or take a walk through another city.
        </StatusScreen>
      );
    case 'invalid_username':
      return (
        <StatusScreen sign="迷子" tone="pink" title="That doesn’t look like a GitHub username" actions={home}>
          GitHub usernames use letters, numbers and hyphens, up to 39 characters.
        </StatusScreen>
      );
    case 'rate_limited':
      return (
        <StatusScreen sign="準備中" tone="amber" title="The city office is closed for a moment" actions={<>{retry}{home}</>}>
          GitHub’s API rate limit was reached{error.resetAt ? `. It resets at ${formatTime(error.resetAt)}` : ''}. Please try
          again after that.
        </StatusScreen>
      );
    case 'not_configured':
      return (
        <StatusScreen
          sign="休業"
          tone="cyan"
          title="This city isn’t connected to GitHub yet"
          actions={
            <Link href="/demo" className={buttonClass}>
              Walk the demo city
            </Link>
          }
        >
          The server needs a <code className="font-dot text-paper">GITHUB_TOKEN</code>. Add one to{' '}
          <code className="font-dot text-paper">.env.local</code> (see <code className="font-dot text-paper">.env.example</code>) and
          restart. The demo city works without it.
        </StatusScreen>
      );
    case 'upstream':
      return (
        <StatusScreen sign="停電" tone="red" title="A blackout on the line to GitHub" actions={<>{retry}{home}</>}>
          {error.message} Try again in a moment.
        </StatusScreen>
      );
  }
}

export function EmptyLotNote({ login }: { login: string }) {
  return (
    <p className="px-4 pt-6 text-center text-mist sm:px-6">
      <span className="mr-2 font-dot text-neon-amber">空き地</span>@{login} has no public repos yet. This lot is waiting for its
      first building.
    </p>
  );
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
}
