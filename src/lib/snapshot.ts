/**
 * The data contract between GitHub fetching and city generation.
 *
 * The fetcher (or a mock) produces a `CitySnapshot`; the pure city pipeline
 * consumes it. `fetchedAt` doubles as the reference "now" for every
 * time-based rule, so a given snapshot always renders the same city.
 */

export interface RepoSnapshot {
  name: string;
  description: string | null;
  url: string;
  isFork: boolean;
  isArchived: boolean;
  /** `owner/name` of the upstream repository, for forks. */
  parent: string | null;
  stars: number;
  forks: number;
  /** Primary language as reported by GitHub. */
  language: string | null;
  /** Size on disk in kilobytes (GitHub's `diskUsage`). */
  diskUsageKb: number;
  /** Commits on the default branch, by all authors. */
  commitCount: number;
  createdAt: string;
  pushedAt: string | null;
  /** Date of the newest commit on the default branch. */
  lastCommitAt: string | null;
}

export interface OwnerSnapshot {
  login: string;
  name: string | null;
  avatarUrl: string;
  url: string;
  kind: 'user' | 'organization';
}

export interface CitySnapshot {
  owner: OwnerSnapshot;
  repos: RepoSnapshot[];
  /** Total public repos the owner has; can exceed `repos.length`. */
  totalRepoCount: number;
  /** ISO timestamp of the fetch, the reference time for recency rules. */
  fetchedAt: string;
}
