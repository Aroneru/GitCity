import type { ReactNode } from 'react';

const TONES = {
  amber: 'border-neon-amber text-neon-amber',
  red: 'border-neon-red text-neon-red',
  cyan: 'border-neon-cyan text-neon-cyan',
  pink: 'border-neon-pink text-neon-pink',
} as const;

interface StatusScreenProps {
  /** A short Japanese shop-sign phrase, shown as a glowing sign. */
  sign: string;
  tone: keyof typeof TONES;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  /** Announce politely to screen readers (loading states). */
  live?: boolean;
  /** Gently pulse the sign, unless the visitor prefers reduced motion. */
  pulse?: boolean;
}

/** A full-page loading, empty or error state, styled like a lit shop sign. */
export function StatusScreen({ sign, tone, title, children, actions, live, pulse }: StatusScreenProps) {
  return (
    <section
      role={live ? 'status' : undefined}
      className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center"
    >
      <p
        className={`border-2 px-5 py-2 font-dot text-3xl [text-shadow:0_0_12px_currentColor] ${TONES[tone]} ${pulse ? 'motion-safe:animate-pulse' : ''}`}
      >
        {sign}
      </p>
      <h1 className="max-w-xl font-pixel text-sm leading-loose sm:text-base">{title}</h1>
      {children && <div className="max-w-md text-mist">{children}</div>}
      {actions && <div className="flex flex-wrap items-center justify-center gap-3">{actions}</div>}
    </section>
  );
}
