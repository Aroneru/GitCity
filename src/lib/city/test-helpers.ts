import type { CitySnapshot, RepoSnapshot } from '../snapshot';

/** Shared builders for the city unit tests. */

export const NOW = Date.parse('2026-11-01T00:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;

export function daysAgo(days: number): string {
  return new Date(NOW - days * DAY_MS).toISOString();
}

export function makeRepo(overrides: Partial<RepoSnapshot> = {}): RepoSnapshot {
  return {
    name: 'repo',
    description: null,
    url: 'https://github.com/octocat/repo',
    isFork: false,
    isArchived: false,
    parent: null,
    stars: 0,
    forks: 0,
    language: 'TypeScript',
    diskUsageKb: 100,
    commitCount: 10,
    createdAt: daysAgo(200),
    pushedAt: daysAgo(1),
    lastCommitAt: daysAgo(1),
    ...overrides,
  };
}

export function makeSnapshot(repos: RepoSnapshot[], login = 'octocat'): CitySnapshot {
  return {
    owner: { login, name: null, avatarUrl: '', url: `https://github.com/${login}`, kind: 'user' },
    repos,
    totalRepoCount: repos.length,
    fetchedAt: new Date(NOW).toISOString(),
  };
}
