import type { CitySnapshot, RepoSnapshot } from '../snapshot';

/**
 * A fictional developer whose repos exercise every building rule: towers
 * with beacons, mid-rises, shops, abandoned blocks, archived shutters, an
 * empty repo, and forks that become izakaya. Used by /demo and the tests.
 */

export const DEMO_FETCHED_AT = '2026-11-01T12:00:00.000Z';
const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgo(days: number): string {
  return new Date(Date.parse(DEMO_FETCHED_AT) - days * DAY_MS).toISOString();
}

interface DemoRepo {
  name: string;
  description: string | null;
  language: string | null;
  commits: number;
  stars: number;
  sizeKb: number;
  /** Days since the last push and commit. */
  pushed: number;
  /** Days since creation. */
  created: number;
  parent?: string;
  archived?: boolean;
}

const DEMO_REPOS: DemoRepo[] = [
  { name: 'night-shift', description: 'A calm task runner for long nights of deploys.', language: 'TypeScript', commits: 3120, stars: 2410, sizeKb: 18_400, pushed: 1, created: 2100 },
  { name: 'lantern-ui', description: 'Soft-glow React components with keyboard-first focus states.', language: 'TypeScript', commits: 1480, stars: 862, sizeKb: 7400, pushed: 3, created: 1500 },
  { name: 'ramen-router', description: 'Tiny HTTP router with zero allocations on the hot path.', language: 'Go', commits: 640, stars: 231, sizeKb: 2100, pushed: 6, created: 1300 },
  { name: 'tokyo-transit-api', description: 'Unofficial timetable API for late trains.', language: 'Rust', commits: 980, stars: 340, sizeKb: 5600, pushed: 20, created: 900 },
  { name: 'kissa-notes', description: 'Markdown notes that sync over plain git.', language: 'Python', commits: 210, stars: 48, sizeKb: 900, pushed: 12, created: 700 },
  { name: 'pixel-shrine', description: 'A tiny shrine-builder game made for a game jam.', language: 'Lua', commits: 76, stars: 12, sizeKb: 300, pushed: 40, created: 400 },
  { name: 'dotfiles', description: 'Zsh, tmux and Neovim, lovingly overengineered.', language: 'Shell', commits: 412, stars: 3, sizeKb: 120, pushed: 2, created: 2600 },
  { name: 'sake-cli', description: 'Pairs your commit messages with a sake.', language: 'Rust', commits: 54, stars: 7, sizeKb: 180, pushed: 90, created: 300 },
  { name: 'umbrella-weather', description: 'Will I need an umbrella tonight? An Android widget.', language: 'Kotlin', commits: 33, stars: 2, sizeKb: 2600, pushed: 150, created: 500 },
  { name: 'bento-box', description: 'Packing-list app for iOS.', language: 'Swift', commits: 18, stars: 1, sizeKb: 800, pushed: 220, created: 600 },
  { name: 'konbini-pos', description: 'Point-of-sale demo for a university course.', language: 'Java', commits: 260, stars: 15, sizeKb: 9800, pushed: 300, created: 1200 },
  { name: 'yatai-cart', description: 'Shopping cart plugin for a small shop.', language: 'PHP', commits: 9, stars: 0, sizeKb: 140, pushed: 330, created: 1100 },
  { name: 'haiku-bot', description: 'Posts a 5-7-5 haiku about your last commit.', language: 'Ruby', commits: 5, stars: 1, sizeKb: 60, pushed: 30, created: 200 },
  { name: 'old-blog', description: 'My first blog. Please do not read the 2015 posts.', language: 'Ruby', commits: 340, stars: 4, sizeKb: 4200, pushed: 1150, created: 3400 },
  { name: 'flash-arcade', description: 'Browser games from a simpler time.', language: 'ActionScript', commits: 120, stars: 22, sizeKb: 15_000, pushed: 2200, created: 3600 },
  { name: 'jquery-tooltips', description: 'Tooltips for jQuery. Archived: use the platform.', language: 'JavaScript', commits: 88, stars: 140, sizeKb: 500, pushed: 1800, created: 3300, archived: true },
  { name: 'advent-of-code', description: 'Puzzle solutions, one December at a time.', language: 'Python', commits: 150, stars: 9, sizeKb: 700, pushed: 330, created: 1800 },
  { name: 'hello-world', description: null, language: null, commits: 1, stars: 0, sizeKb: 1, pushed: 1900, created: 1900 },
  { name: 'todo', description: 'Nothing here yet.', language: null, commits: 0, stars: 0, sizeKb: 0, pushed: 10, created: 10 },
  { name: 'resume', description: 'My CV, built with plain HTML and print CSS.', language: 'HTML', commits: 24, stars: 0, sizeKb: 2400, pushed: 45, created: 800 },
  { name: 'css-sakura', description: 'Falling cherry blossoms in pure CSS.', language: 'CSS', commits: 12, stars: 31, sizeKb: 90, pushed: 60, created: 400 },
  { name: 'neon-shader', description: 'A fragment shader for wet neon reflections.', language: 'GLSL', commits: 7, stars: 64, sizeKb: 350, pushed: 15, created: 120 },
  { name: 'mahjong-solver', description: 'Finds the best discard, slowly.', language: 'C++', commits: 230, stars: 18, sizeKb: 1300, pushed: 70, created: 900 },
  { name: 'vending-sim', description: 'A vending machine simulator in Unity.', language: 'C#', commits: 15, stars: 0, sizeKb: 25_000, pushed: 400, created: 700 },
  { name: 'dash-dash', description: 'Flutter experiments.', language: 'Dart', commits: 3, stars: 0, sizeKb: 40, pushed: 8, created: 30 },
  { name: 'tiny-tea', description: 'An Elixir tea timer.', language: 'Elixir', commits: 2, stars: 0, sizeKb: 20, pushed: 4, created: 6 },
  { name: 'ink', description: 'A typeset-anything toy language.', language: 'Haskell', commits: 40, stars: 5, sizeKb: 200, pushed: 120, created: 600 },
  { name: 'paper-crane', description: 'Fold SVGs into cranes.', language: 'Zig', commits: 6, stars: 2, sizeKb: 30, pushed: 18, created: 50 },
  { name: 'scribble', description: 'Sketchpad for meetings.', language: 'Vue', commits: 1, stars: 0, sizeKb: 10, pushed: 2, created: 2 },
  { name: 'react', description: 'The library for web and native user interfaces.', language: 'JavaScript', commits: 19_400, stars: 0, sizeKb: 350_000, pushed: 400, created: 900, parent: 'facebook/react' },
  { name: 'linux', description: 'Linux kernel source tree', language: 'C', commits: 1_300_000, stars: 0, sizeKb: 5_000_000, pushed: 760, created: 1000, parent: 'torvalds/linux' },
  { name: 'neovim', description: 'Vim-fork focused on extensibility and usability', language: 'Vim Script', commits: 30_000, stars: 0, sizeKb: 200_000, pushed: 20, created: 500, parent: 'neovim/neovim' },
  { name: 'deno', description: 'A modern runtime for JavaScript and TypeScript.', language: 'Rust', commits: 12_000, stars: 1, sizeKb: 90_000, pushed: 5, created: 300, parent: 'denoland/deno' },
  { name: 'tailwindcss', description: 'A utility-first CSS framework.', language: 'TypeScript', commits: 6000, stars: 0, sizeKb: 50_000, pushed: 60, created: 400, parent: 'tailwindlabs/tailwindcss' },
  { name: 'awesome-japan', description: 'A curated list of things to see in Japan.', language: null, commits: 300, stars: 0, sizeKb: 800, pushed: 10, created: 200, parent: 'someone/awesome-japan' },
];

export const DEMO_LOGIN = 'gitcity-demo';

export function toRepoSnapshot(repo: DemoRepo, owner = DEMO_LOGIN): RepoSnapshot {
  return {
    name: repo.name,
    description: repo.description,
    url: `https://github.com/${owner}/${repo.name}`,
    isFork: repo.parent !== undefined,
    isArchived: repo.archived ?? false,
    parent: repo.parent ?? null,
    stars: repo.stars,
    forks: Math.floor(repo.stars / 9),
    language: repo.language,
    diskUsageKb: repo.sizeKb,
    commitCount: repo.commits,
    createdAt: daysAgo(repo.created),
    pushedAt: daysAgo(repo.pushed),
    lastCommitAt: repo.commits > 0 ? daysAgo(repo.pushed) : null,
  };
}

export function createDemoSnapshot(): CitySnapshot {
  return {
    owner: {
      login: DEMO_LOGIN,
      name: 'Demo City',
      avatarUrl: '',
      url: 'https://github.com',
      kind: 'user',
    },
    repos: DEMO_REPOS.map((repo) => toRepoSnapshot(repo)),
    totalRepoCount: DEMO_REPOS.length,
    fetchedAt: DEMO_FETCHED_AT,
  };
}
