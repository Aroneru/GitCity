import type { OwnerSnapshot, RepoSnapshot } from '../snapshot';

/** The shapes GitHub returns for `CITY_QUERY`. */

export interface RawRepo {
  name: string;
  description: string | null;
  url: string;
  isFork: boolean;
  isArchived: boolean;
  stargazerCount: number;
  forkCount: number;
  diskUsage: number | null;
  createdAt: string;
  pushedAt: string | null;
  primaryLanguage: { name: string } | null;
  parent: { nameWithOwner: string } | null;
  /** Null for empty repos; the target can be a non-commit (e.g. a tag) in odd repos. */
  defaultBranchRef: {
    target: { committedDate?: string; history?: { totalCount: number } } | null;
  } | null;
}

export interface RawOwner {
  __typename: string;
  login: string;
  url: string;
  avatarUrl: string;
  name?: string | null;
  repositories: {
    totalCount: number;
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    nodes: Array<RawRepo | null> | null;
  };
}

export interface RawGraphQLError {
  type?: string;
  message: string;
}

export interface RawCityResponse {
  data?: { repositoryOwner: RawOwner | null } | null;
  errors?: RawGraphQLError[];
  /** REST-style error bodies (401s, secondary rate limits) carry a top-level message. */
  message?: string;
}

export function normalizeOwner(raw: RawOwner): OwnerSnapshot {
  return {
    login: raw.login,
    name: raw.name?.trim() || null,
    avatarUrl: raw.avatarUrl,
    url: raw.url,
    kind: raw.__typename === 'Organization' ? 'organization' : 'user',
  };
}

export function normalizeRepo(raw: RawRepo): RepoSnapshot {
  const head = raw.defaultBranchRef?.target ?? null;
  return {
    name: raw.name,
    description: raw.description?.trim() || null,
    url: raw.url,
    isFork: raw.isFork,
    isArchived: raw.isArchived,
    parent: raw.parent?.nameWithOwner ?? null,
    stars: raw.stargazerCount,
    forks: raw.forkCount,
    language: raw.primaryLanguage?.name ?? null,
    diskUsageKb: raw.diskUsage ?? 0,
    commitCount: head?.history?.totalCount ?? 0,
    createdAt: raw.createdAt,
    pushedAt: raw.pushedAt,
    lastCommitAt: head?.committedDate ?? null,
  };
}
