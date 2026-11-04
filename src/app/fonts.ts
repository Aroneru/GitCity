import { DotGothic16, Press_Start_2P } from 'next/font/google';

/** Arcade pixel font for headings (Latin only). */
export const pressStart = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-press-start',
  display: 'swap',
});

/**
 * Pixel-style Japanese font for UI accents. The city renderer also draws
 * every sign from it, reading the family name from `dotGothic.style`.
 * Japanese glyphs arrive in unicode-range slices as they are needed.
 */
export const dotGothic = DotGothic16({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-dotgothic',
  display: 'swap',
});
