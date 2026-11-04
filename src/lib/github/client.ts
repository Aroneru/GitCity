import { cityError, type CityResult } from '../api';
import type { RepoSnapshot } from '../snapshot';
import { normalizeOwner, normalizeRepo, type RawCityResponse, type RawOwner, type RawRepo } from './normalize';
import { CITY_QUERY } from './query';

/**
 * Fetches an owner's public repos from GitHub's GraphQL API and turns them
 * into a `CitySnapshot`. Never throws for expected failures: every problem
 * comes back as a typed `CityError`.
 */

export const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';
/** A city shows at most this many repos: the most recently pushed. */
export const REPO_LIMIT = 100;
const PAGE_SIZE = 50;
/** Counting commits on big repos can time out; retry such a page smaller. */
const RETRY_PAGE_SIZE = 20;
const TIMEOUT_MS = 15_000;

export interface FetchOptions {
  token: string | undefined;
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

/** One page of data, or the error that ends the fetch (`retryable` errors get one smaller retry). */
export type Page = { ok: true; owner: RawOwner } | { ok: false; result: CityResult; retryable: boolean };

export async function fetchCitySnapshot(
  login: string,
  { token, fetchImpl = fetch, now = () => new Date() }: FetchOptions,
): Promise<CityResult> {
  if (!token) return cityError('not_configured', 'The server has no GitHub token. Set GITHUB_TOKEN in .env.local.');

  const repos: RepoSnapshot[] = [];
  let owner: RawOwner | null = null;
  let after: string | null = null;

  while (repos.length < REPO_LIMIT) {
    const first = Math.min(PAGE_SIZE, REPO_LIMIT - repos.length);
    let page = await requestPage(fetchImpl, token, { login, first, after }, now);
    if (!page.ok && page.retryable) {
      page = await requestPage(fetchImpl, token, { login, first: Math.min(first, RETRY_PAGE_SIZE), after }, now);
    }
    if (!page.ok) return page.result;

    owner = page.owner;
    const { nodes, pageInfo } = page.owner.repositories;
    repos.push(...(nodes ?? []).filter((node): node is RawRepo => node !== null).map(normalizeRepo));
    if (!pageInfo.hasNextPage || !pageInfo.endCursor) break;
    after = pageInfo.endCursor;
  }

  if (!owner) return cityError('upstream', 'GitHub returned no data.');
  return {
    ok: true,
    snapshot: {
      owner: normalizeOwner(owner),
      repos: repos.slice(0, REPO_LIMIT),
      totalRepoCount: owner.repositories.totalCount,
      fetchedAt: now().toISOString(),
    },
  };
}

async function requestPage(
  fetchImpl: typeof fetch,
  token: string,
  variables: { login: string; first: number; after: string | null },
  now: () => Date,
): Promise<Page> {
  let response: Response;
  try {
    response = await fetchImpl(GITHUB_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'GitCity',
      },
      body: JSON.stringify({ query: CITY_QUERY, variables }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return { ok: false, retryable: true, result: cityError('upstream', 'GitHub did not respond in time.') };
  }
  const body = (await response.json().catch(() => null)) as RawCityResponse | null;
  return classifyResponse(response.status, response.headers, body, now());
}

/** Map one GraphQL response onto a page of data or a typed error. */
export function classifyResponse(status: number, headers: Headers, body: RawCityResponse | null, now: Date): Page {
  const errors = body?.errors ?? [];
  const message = [body?.message, ...errors.map((e) => e.message)].filter(Boolean).join(' ');

  if (status === 401) {
    return { ok: false, retryable: false, result: cityError('not_configured', 'GitHub rejected the server’s token.') };
  }

  // GitHub signals rate limits with 403/429, and on GraphQL even with a 200.
  const rateLimited =
    status === 429 ||
    (status === 403 &&
      (headers.get('x-ratelimit-remaining') === '0' || headers.has('retry-after') || /rate limit/i.test(message))) ||
    errors.some((e) => e.type === 'RATE_LIMITED') ||
    (status === 200 && /rate limit/i.test(message) && !body?.data?.repositoryOwner);
  if (rateLimited) {
    return {
      ok: false,
      retryable: false,
      result: cityError('rate_limited', 'GitHub’s API rate limit was reached.', rateLimitReset(headers, now)),
    };
  }

  if (status >= 500 || body === null) {
    return { ok: false, retryable: status >= 500, result: cityError('upstream', `GitHub returned an error (${status}).`) };
  }

  const owner = body.data?.repositoryOwner ?? null;
  if (!owner) {
    // Only a successful query that resolved no owner means "no such user".
    if (status === 200 && (errors.length === 0 || errors.some((e) => e.type === 'NOT_FOUND'))) {
      return { ok: false, retryable: false, result: cityError('not_found', 'No GitHub user or organization has that name.') };
    }
    return {
      ok: false,
      retryable: /timeout|timed out|something went wrong/i.test(message),
      result: cityError('upstream', message || 'GitHub returned an error.'),
    };
  }
  return { ok: true, owner };
}

/** When the rate limit lifts: `retry-after` seconds, else the `x-ratelimit-reset` epoch. */
export function rateLimitReset(headers: Headers, now: Date): string | null {
  const retryAfter = Number(headers.get('retry-after'));
  if (Number.isFinite(retryAfter) && retryAfter > 0) return new Date(now.getTime() + retryAfter * 1000).toISOString();
  const reset = Number(headers.get('x-ratelimit-reset'));
  if (Number.isFinite(reset) && reset > 0) return new Date(reset * 1000).toISOString();
  return null;
}
