import type { CitySnapshot } from '../snapshot';
import { floorsForCommits, isAbandoned, RULES } from './rules';
import { compareNames } from './seed';

export interface CityStats {
  buildings: number;
  /** All public repos the owner has; more than `buildings` when capped. */
  totalRepos: number;
  tallest: { name: string; floors: number; commits: number } | null;
  /** Most common primary language among the owner's own (non-fork) repos. */
  topLanguage: { name: string; repos: number } | null;
  oldest: { name: string; createdAt: string } | null;
  stars: number;
  forks: number;
  abandoned: number;
}

export function computeStats(snapshot: CitySnapshot): CityStats {
  const { repos } = snapshot;
  const nowMs = Date.parse(snapshot.fetchedAt);
  const floorsOf = (commits: number, isFork: boolean) =>
    isFork ? (commits >= RULES.izakayaTwoFloorCommits ? 2 : 1) : floorsForCommits(commits);

  let tallest: CityStats['tallest'] = null;
  for (const repo of repos) {
    const candidate = { name: repo.name, floors: floorsOf(repo.commitCount, repo.isFork), commits: repo.commitCount };
    if (
      !tallest ||
      candidate.floors > tallest.floors ||
      (candidate.floors === tallest.floors &&
        (candidate.commits > tallest.commits ||
          (candidate.commits === tallest.commits && compareNames(candidate.name, tallest.name) < 0)))
    ) {
      tallest = candidate;
    }
  }

  // Count the owner's own code first; fall back to forks if that's all there is.
  const own = repos.filter((repo) => !repo.isFork && repo.language);
  const counted = own.length > 0 ? own : repos.filter((repo) => repo.language);
  const counts = new Map<string, number>();
  for (const repo of counted) counts.set(repo.language!, (counts.get(repo.language!) ?? 0) + 1);
  let topLanguage: CityStats['topLanguage'] = null;
  for (const [name, count] of counts) {
    if (!topLanguage || count > topLanguage.repos || (count === topLanguage.repos && compareNames(name, topLanguage.name) < 0)) {
      topLanguage = { name, repos: count };
    }
  }

  let oldest: CityStats['oldest'] = null;
  for (const repo of repos) {
    const age = oldest ? Date.parse(repo.createdAt) - Date.parse(oldest.createdAt) : -1;
    if (!oldest || age < 0 || (age === 0 && compareNames(repo.name, oldest.name) < 0)) {
      oldest = { name: repo.name, createdAt: repo.createdAt };
    }
  }

  return {
    buildings: repos.length,
    totalRepos: Math.max(snapshot.totalRepoCount, repos.length),
    tallest,
    topLanguage,
    oldest,
    stars: repos.reduce((sum, repo) => sum + repo.stars, 0),
    forks: repos.filter((repo) => repo.isFork).length,
    abandoned: repos.filter((repo) => isAbandoned(repo, nowMs)).length,
  };
}
