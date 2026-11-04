import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

interface CityHeaderProps {
  title: ReactNode;
  /** GitHub avatar, shown as a tiny pixelated portrait. */
  avatarUrl?: string;
  details?: ReactNode;
}

export function CityHeader({ title, avatarUrl, details }: CityHeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-4 sm:px-6">
      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
        <Link href="/" className="font-pixel text-sm text-paper hover:text-neon-amber">
          GitCity
        </Link>
        <div className="flex min-w-0 items-center gap-2">
          {avatarUrl && (
            <Image
              src={pixelAvatar(avatarUrl)}
              alt=""
              width={32}
              height={32}
              unoptimized
              className="pixelated border border-night-600"
            />
          )}
          <h1 className="truncate font-dot text-paper">{title}</h1>
        </div>
        {details && <p className="font-dot text-sm text-mist">{details}</p>}
      </div>
      <p className="text-sm text-mist">Scroll sideways to walk the street.</p>
    </header>
  );
}

/** Ask GitHub for a 16px avatar; shown at 32px with pixelated scaling, it becomes pixel art. */
function pixelAvatar(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('s', '16');
    return parsed.toString();
  } catch {
    return url;
  }
}
