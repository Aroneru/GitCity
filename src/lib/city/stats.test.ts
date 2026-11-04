import { describe, expect, it } from 'vitest';
import { createDemoSnapshot } from '../mock/demo';
import { computeStats } from './stats';
import { daysAgo, makeRepo, makeSnapshot } from './test-helpers';

describe('computeStats', () => {
  it('summarizes the demo city', () => {
    const stats = computeStats(createDemoSnapshot());
    expect(stats.buildings).toBe(35);
    expect(stats.tallest).toMatchObject({ name: 'night-shift', commits: 3120 });
    // Python, Ruby, Rust and TypeScript tie at two repos; ties go alphabetically.
    expect(stats.topLanguage).toEqual({ name: 'Python', repos: 2 });
    expect(stats.oldest?.name).toBe('flash-arcade');
    expect(stats.forks).toBe(6);
    expect(stats.abandoned).toBe(7);
  });

  it('measures height in floors, so a fork with huge upstream history is not the tallest', () => {
    const stats = computeStats(
      makeSnapshot([makeRepo({ name: 'linux', isFork: true, commitCount: 1_300_000 }), makeRepo({ name: 'mine', commitCount: 50 })]),
    );
    expect(stats.tallest?.name).toBe('mine');
  });

  it('counts the owner’s own code for the top language, falling back to forks', () => {
    const own = computeStats(
      makeSnapshot([
        makeRepo({ name: 'a', language: 'Go' }),
        makeRepo({ name: 'b', language: 'C', isFork: true }),
        makeRepo({ name: 'c', language: 'C', isFork: true }),
      ]),
    );
    expect(own.topLanguage).toEqual({ name: 'Go', repos: 1 });

    const forksOnly = computeStats(makeSnapshot([makeRepo({ name: 'b', language: 'C', isFork: true })]));
    expect(forksOnly.topLanguage).toEqual({ name: 'C', repos: 1 });
  });

  it('finds the oldest repo by creation date', () => {
    const stats = computeStats(
      makeSnapshot([makeRepo({ name: 'new', createdAt: daysAgo(5) }), makeRepo({ name: 'old', createdAt: daysAgo(4000) })]),
    );
    expect(stats.oldest).toEqual({ name: 'old', createdAt: daysAgo(4000) });
  });

  it('reports all repos when the city is capped', () => {
    const snapshot = { ...makeSnapshot([makeRepo()]), totalRepoCount: 240 };
    expect(computeStats(snapshot).totalRepos).toBe(240);
  });

  it('handles an owner with no repos', () => {
    expect(computeStats(makeSnapshot([]))).toEqual({
      buildings: 0,
      totalRepos: 0,
      tallest: null,
      topLanguage: null,
      oldest: null,
      stars: 0,
      forks: 0,
      abandoned: 0,
    });
  });
});
