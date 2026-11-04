import { describe, expect, it, vi } from 'vitest';
import { GITHUB_GRAPHQL_URL, fetchCitySnapshot, rateLimitReset } from './client';
import type { RawCityResponse, RawRepo } from './normalize';

const NOW = new Date('2026-11-01T00:00:00.000Z');
const now = () => NOW;

function rawRepo(i: number, overrides: Partial<RawRepo> = {}): RawRepo {
  return {
    name: `repo-${i}`,
    description: null,
    url: `https://github.com/octocat/repo-${i}`,
    isFork: false,
    isArchived: false,
    stargazerCount: i,
    forkCount: 0,
    diskUsage: 100,
    createdAt: '2020-01-01T00:00:00Z',
    pushedAt: '2026-10-01T00:00:00Z',
    primaryLanguage: { name: 'Go' },
    parent: null,
    defaultBranchRef: { target: { committedDate: '2026-10-01T00:00:00Z', history: { totalCount: 10 } } },
    ...overrides,
  };
}

function repos(from: number, count: number): RawRepo[] {
  return Array.from({ length: count }, (_, i) => rawRepo(from + i));
}

function page(
  nodes: Array<RawRepo | null>,
  { hasNextPage = false, endCursor = null as string | null, totalCount = nodes.length } = {},
): RawCityResponse {
  return {
    data: {
      repositoryOwner: {
        __typename: 'User',
        login: 'Octocat',
        url: 'https://github.com/octocat',
        avatarUrl: 'https://avatars.githubusercontent.com/u/583231?v=4',
        name: 'The Octocat',
        repositories: { totalCount, pageInfo: { hasNextPage, endCursor }, nodes },
      },
    },
  };
}

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });
}

function fakeFetch(...responses: Array<Response | Error>) {
  const fn = vi.fn<typeof fetch>();
  for (const response of responses) {
    if (response instanceof Error) fn.mockRejectedValueOnce(response);
    else fn.mockResolvedValueOnce(response);
  }
  return fn;
}

function sentVariables(fn: ReturnType<typeof fakeFetch>, call: number) {
  const init = fn.mock.calls[call][1];
  return JSON.parse(String(init?.body)).variables;
}

describe('fetchCitySnapshot', () => {
  it('needs a token and does not call GitHub without one', async () => {
    const fetchImpl = fakeFetch();
    const result = await fetchCitySnapshot('octocat', { token: undefined, fetchImpl, now });
    expect(result).toMatchObject({ ok: false, error: { code: 'not_configured' } });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('posts the query with a bearer token', async () => {
    const fetchImpl = fakeFetch(json(page(repos(0, 3))));
    await fetchCitySnapshot('octocat', { token: 'secret', fetchImpl, now });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(GITHUB_GRAPHQL_URL);
    expect(init?.method).toBe('POST');
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer secret');
    expect(sentVariables(fetchImpl, 0)).toEqual({ login: 'octocat', first: 50, after: null });
  });

  it('turns one page into a snapshot stamped with the fetch time', async () => {
    const fetchImpl = fakeFetch(json(page(repos(0, 3))));
    const result = await fetchCitySnapshot('octocat', { token: 't', fetchImpl, now });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot.owner).toMatchObject({ login: 'Octocat', name: 'The Octocat', kind: 'user' });
    expect(result.snapshot.repos.map((r) => r.name)).toEqual(['repo-0', 'repo-1', 'repo-2']);
    expect(result.snapshot.totalRepoCount).toBe(3);
    expect(result.snapshot.fetchedAt).toBe(NOW.toISOString());
  });

  it('follows pagination and stops at the 100-repo cap', async () => {
    const fetchImpl = fakeFetch(
      json(page(repos(0, 50), { hasNextPage: true, endCursor: 'c1', totalCount: 240 })),
      json(page(repos(50, 50), { hasNextPage: true, endCursor: 'c2', totalCount: 240 })),
    );
    const result = await fetchCitySnapshot('octocat', { token: 't', fetchImpl, now });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sentVariables(fetchImpl, 1)).toEqual({ login: 'octocat', first: 50, after: 'c1' });
    expect(result).toMatchObject({ ok: true, snapshot: { totalRepoCount: 240 } });
    if (result.ok) expect(result.snapshot.repos).toHaveLength(100);
  });

  it('stops when GitHub has no more pages', async () => {
    const fetchImpl = fakeFetch(json(page(repos(0, 30))));
    await fetchCitySnapshot('octocat', { token: 't', fetchImpl, now });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('skips null repo nodes', async () => {
    const fetchImpl = fakeFetch(json(page([rawRepo(1), null])));
    const result = await fetchCitySnapshot('octocat', { token: 't', fetchImpl, now });
    if (result.ok) expect(result.snapshot.repos).toHaveLength(1);
  });

  it('reports an unknown owner as not found', async () => {
    const plainNull = await fetchCitySnapshot('ghost', { token: 't', fetchImpl: fakeFetch(json({ data: { repositoryOwner: null } })), now });
    expect(plainNull).toMatchObject({ ok: false, error: { code: 'not_found' } });

    const typed = await fetchCitySnapshot('ghost', {
      token: 't',
      fetchImpl: fakeFetch(json({ data: { repositoryOwner: null }, errors: [{ type: 'NOT_FOUND', message: 'Could not resolve' }] })),
      now,
    });
    expect(typed).toMatchObject({ ok: false, error: { code: 'not_found' } });
  });

  it('detects GraphQL rate limits even on HTTP 200', async () => {
    const reset = Math.floor(NOW.getTime() / 1000) + 1800;
    const fetchImpl = fakeFetch(
      json({ errors: [{ type: 'RATE_LIMITED', message: 'API rate limit exceeded' }] }, 200, { 'x-ratelimit-reset': String(reset) }),
    );
    const result = await fetchCitySnapshot('octocat', { token: 't', fetchImpl, now });
    expect(result).toEqual({
      ok: false,
      error: { code: 'rate_limited', message: expect.any(String), resetAt: new Date(reset * 1000).toISOString() },
    });
  });

  it('detects secondary rate limits from a 403 with retry-after', async () => {
    const fetchImpl = fakeFetch(json({ message: 'You have exceeded a secondary rate limit.' }, 403, { 'retry-after': '60' }));
    const result = await fetchCitySnapshot('octocat', { token: 't', fetchImpl, now });
    expect(result).toMatchObject({ ok: false, error: { code: 'rate_limited', resetAt: new Date(NOW.getTime() + 60_000).toISOString() } });
  });

  it('never reports other client errors as a missing user', async () => {
    const fetchImpl = fakeFetch(json({ message: 'Resource not accessible by personal access token' }, 403));
    const result = await fetchCitySnapshot('octocat', { token: 't', fetchImpl, now });
    expect(result).toMatchObject({ ok: false, error: { code: 'upstream' } });
  });

  it('treats a rejected token as a configuration problem', async () => {
    const result = await fetchCitySnapshot('octocat', { token: 'bad', fetchImpl: fakeFetch(json({ message: 'Bad credentials' }, 401)), now });
    expect(result).toMatchObject({ ok: false, error: { code: 'not_configured' } });
  });

  it('retries a failed page once, with a smaller page size', async () => {
    const fetchImpl = fakeFetch(json({ message: 'Bad gateway' }, 502), json(page(repos(0, 20))));
    const result = await fetchCitySnapshot('octocat', { token: 't', fetchImpl, now });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sentVariables(fetchImpl, 1).first).toBe(20);
    expect(result.ok).toBe(true);
  });

  it('gives up after the retry fails too', async () => {
    const fetchImpl = fakeFetch(json({}, 502), json({}, 504));
    const result = await fetchCitySnapshot('octocat', { token: 't', fetchImpl, now });
    expect(result).toMatchObject({ ok: false, error: { code: 'upstream' } });
  });

  it('turns network failures into upstream errors', async () => {
    const fetchImpl = fakeFetch(new TypeError('fetch failed'), new TypeError('fetch failed'));
    const result = await fetchCitySnapshot('octocat', { token: 't', fetchImpl, now });
    expect(result).toMatchObject({ ok: false, error: { code: 'upstream' } });
  });
});

describe('rateLimitReset', () => {
  it('prefers retry-after, then the reset epoch, else nothing', () => {
    expect(rateLimitReset(new Headers({ 'retry-after': '30', 'x-ratelimit-reset': '1' }), NOW)).toBe(
      new Date(NOW.getTime() + 30_000).toISOString(),
    );
    expect(rateLimitReset(new Headers({ 'x-ratelimit-reset': '1800000000' }), NOW)).toBe(new Date(1_800_000_000_000).toISOString());
    expect(rateLimitReset(new Headers(), NOW)).toBeNull();
  });
});
