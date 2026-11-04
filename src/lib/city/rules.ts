import type { RepoSnapshot } from '../snapshot';
import { neonForLanguage, type NeonHue } from './languages';

/**
 * The building rules: pure functions that turn one repo into one building.
 * Every threshold lives in `RULES` so the mapping can be tuned in one place.
 */

export type BuildingKind = 'shop' | 'midrise' | 'tower' | 'izakaya';
export type WidthTier = 'S' | 'M' | 'L';
export type RooftopTier = 'none' | 'antenna' | 'billboard' | 'beacon';

export const RULES = {
  /** floors = 1 + round(floorsPerDecade × log10(1 + commits)) */
  floorsPerDecade: 4,
  maxFloors: 22,
  shopMaxFloors: 4,
  midriseMaxFloors: 10,
  /** Forks are one-storey izakaya; big upstream projects get a second floor. */
  izakayaTwoFloorCommits: 500,
  /** Disk size tiers, in KB. */
  mediumMinKb: 512,
  largeMinKb: 5 * 1024,
  antennaMinStars: 10,
  billboardMinStars: 100,
  beaconMinStars: 1000,
  abandonedAfterDays: 365,
  /** Lit share = litMin + (litMax − litMin) × e^(−days / litDecayDays) */
  litMax: 0.9,
  litMin: 0.1,
  litDecayDays: 120,
} as const;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface BuildingSpec {
  repoName: string;
  kind: BuildingKind;
  floors: number;
  widthTier: WidthTier;
  neon: NeonHue;
  /** Share of windows lit, 0..1. */
  litRatio: number;
  rooftop: RooftopTier;
  /** No commits for over a year: dark facade, broken sign. */
  abandoned: boolean;
  archived: boolean;
}

export function floorsForCommits(commits: number): number {
  const safe = Math.max(0, Number.isFinite(commits) ? commits : 0);
  const floors = 1 + Math.round(RULES.floorsPerDecade * Math.log10(1 + safe));
  return Math.min(RULES.maxFloors, floors);
}

export function kindForFloors(floors: number): Exclude<BuildingKind, 'izakaya'> {
  if (floors <= RULES.shopMaxFloors) return 'shop';
  if (floors <= RULES.midriseMaxFloors) return 'midrise';
  return 'tower';
}

export function widthTierForSize(diskUsageKb: number): WidthTier {
  if (diskUsageKb >= RULES.largeMinKb) return 'L';
  if (diskUsageKb >= RULES.mediumMinKb) return 'M';
  return 'S';
}

export function rooftopForStars(stars: number): RooftopTier {
  if (stars >= RULES.beaconMinStars) return 'beacon';
  if (stars >= RULES.billboardMinStars) return 'billboard';
  if (stars >= RULES.antennaMinStars) return 'antenna';
  return 'none';
}

/** Whole days from an ISO date to `nowMs`; null for a missing date. */
export function daysSince(iso: string | null, nowMs: number): number | null {
  if (!iso) return null;
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return null;
  return Math.max(0, Math.floor((nowMs - then) / DAY_MS));
}

export function litRatioForAge(daysSincePush: number | null): number {
  if (daysSincePush === null) return RULES.litMin;
  const decay = Math.exp(-daysSincePush / RULES.litDecayDays);
  return RULES.litMin + (RULES.litMax - RULES.litMin) * decay;
}

/** The newest sign of life: last commit, else last push, else creation. */
export function lastActivity(repo: RepoSnapshot): string {
  return repo.lastCommitAt ?? repo.pushedAt ?? repo.createdAt;
}

export function isAbandoned(repo: RepoSnapshot, nowMs: number): boolean {
  const days = daysSince(lastActivity(repo), nowMs);
  return days !== null && days > RULES.abandonedAfterDays;
}

export function toBuildingSpec(repo: RepoSnapshot, nowMs: number): BuildingSpec {
  const abandoned = isAbandoned(repo, nowMs);
  const kind = repo.isFork ? 'izakaya' : kindForFloors(floorsForCommits(repo.commitCount));
  const floors = repo.isFork
    ? repo.commitCount >= RULES.izakayaTwoFloorCommits
      ? 2
      : 1
    : floorsForCommits(repo.commitCount);

  return {
    repoName: repo.name,
    kind,
    floors,
    widthTier: widthTierForSize(repo.diskUsageKb),
    neon: neonForLanguage(repo.language),
    litRatio: abandoned ? 0 : litRatioForAge(daysSince(repo.pushedAt, nowMs)),
    rooftop: rooftopForStars(repo.stars),
    abandoned,
    archived: repo.isArchived,
  };
}
