/** Shared class lists for the arcade-style controls. */

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neon-cyan';

export const buttonClass = `inline-flex items-center justify-center border-2 border-neon-amber bg-night-800 px-4 py-3 font-pixel text-xs text-neon-amber transition-colors hover:bg-neon-amber hover:text-night-950 motion-reduce:transition-none ${focusRing}`;

export const chipClass = `inline-flex items-center border-2 border-night-600 bg-night-900 px-3 py-2 font-dot text-paper transition-colors hover:border-neon-pink hover:text-neon-pink motion-reduce:transition-none ${focusRing}`;
