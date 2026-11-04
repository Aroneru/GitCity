import { describe, expect, it } from 'vitest';
import { normalizeOwner, normalizeRepo, type RawOwner, type RawRepo } from './normalize';

const base: RawRepo = {
  name: 'lantern',
  description: '  Soft-glow components  ',
  url: 'https://github.com/octocat/lantern',
  isFork: true,
  isArchived: false,
  stargazerCount: 120,
  forkCount: 7,
  diskUsage: 2048,
  createdAt: '2020-01-01T00:00:00Z',
  pushedAt: '2026-10-30T00:00:00Z',
  primaryLanguage: { name: 'TypeScript' },
  parent: { nameWithOwner: 'upstream/lantern' },
  defaultBranchRef: { target: { committedDate: '2026-10-29T00:00:00Z', history: { totalCount: 345 } } },
};

describe('normalizeRepo', () => {
  it('maps the GraphQL fields onto the snapshot', () => {
    expect(normalizeRepo(base)).toEqual({
      name: 'lantern',
      description: 'Soft-glow components',
      url: 'https://github.com/octocat/lantern',
      isFork: true,
      isArchived: false,
      parent: 'upstream/lantern',
      stars: 120,
      forks: 7,
      language: 'TypeScript',
      diskUsageKb: 2048,
      commitCount: 345,
      createdAt: '2020-01-01T00:00:00Z',
      pushedAt: '2026-10-30T00:00:00Z',
      lastCommitAt: '2026-10-29T00:00:00Z',
    });
  });

  it('handles empty repos, odd default branches and missing values', () => {
    const empty = normalizeRepo({ ...base, defaultBranchRef: null, primaryLanguage: null, description: '   ', diskUsage: null, parent: null });
    expect(empty).toMatchObject({ commitCount: 0, lastCommitAt: null, language: null, description: null, diskUsageKb: 0, parent: null });

    const tagTarget = normalizeRepo({ ...base, defaultBranchRef: { target: {} } });
    expect(tagTarget).toMatchObject({ commitCount: 0, lastCommitAt: null });
  });
});

describe('normalizeOwner', () => {
  const owner: RawOwner = {
    __typename: 'Organization',
    login: 'GitCityHQ',
    url: 'https://github.com/GitCityHQ',
    avatarUrl: 'https://avatars.githubusercontent.com/u/1?v=4',
    name: '  ',
    repositories: { totalCount: 0, pageInfo: { hasNextPage: false, endCursor: null }, nodes: [] },
  };

  it('recognizes organizations and drops blank names', () => {
    expect(normalizeOwner(owner)).toEqual({
      login: 'GitCityHQ',
      name: null,
      avatarUrl: 'https://avatars.githubusercontent.com/u/1?v=4',
      url: 'https://github.com/GitCityHQ',
      kind: 'organization',
    });
    expect(normalizeOwner({ ...owner, __typename: 'User', name: 'Mona' })).toMatchObject({ kind: 'user', name: 'Mona' });
  });
});
