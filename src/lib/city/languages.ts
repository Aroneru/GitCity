import { hash32 } from './seed';

/**
 * Neon hues for signs, anchored on the palette's pink, cyan, amber and red.
 * `plain` is a warm white lightbox for repos without a detected language.
 */
export const NEON_HUES = ['pink', 'cyan', 'amber', 'red', 'violet', 'mint', 'orange', 'ice'] as const;
export type NeonHue = (typeof NEON_HUES)[number] | 'plain';

/** Fixed hues for common languages, loosely following GitHub's language colors. */
const LANGUAGE_HUES: Readonly<Record<string, NeonHue>> = {
  typescript: 'cyan',
  javascript: 'amber',
  python: 'ice',
  java: 'orange',
  go: 'cyan',
  rust: 'orange',
  'c++': 'pink',
  c: 'ice',
  'c#': 'mint',
  php: 'violet',
  ruby: 'pink',
  shell: 'mint',
  html: 'red',
  css: 'violet',
  scss: 'pink',
  kotlin: 'violet',
  swift: 'orange',
  dart: 'mint',
  vue: 'mint',
  svelte: 'red',
  'jupyter notebook': 'orange',
  lua: 'cyan',
  haskell: 'violet',
  elixir: 'violet',
  erlang: 'pink',
  scala: 'red',
  clojure: 'red',
  r: 'cyan',
  'objective-c': 'cyan',
  zig: 'amber',
  nix: 'violet',
  'vim script': 'mint',
  dockerfile: 'ice',
  ocaml: 'orange',
  julia: 'violet',
  perl: 'cyan',
  powershell: 'cyan',
  mdx: 'amber',
  astro: 'orange',
};

export function neonForLanguage(language: string | null): NeonHue {
  if (!language) return 'plain';
  const key = language.trim().toLowerCase();
  if (!key) return 'plain';
  return LANGUAGE_HUES[key] ?? NEON_HUES[hash32(key) % NEON_HUES.length];
}
