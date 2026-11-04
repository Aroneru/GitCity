import type { CitySnapshot } from './snapshot';

/**
 * The contract of `GET /api/city/[username]`, shared by the route handler
 * and the browser: a snapshot on success, or a typed error the UI can
 * explain in a friendly way.
 */

export type CityErrorCode = 'invalid_username' | 'not_found' | 'rate_limited' | 'not_configured' | 'upstream';

export interface CityError {
  code: CityErrorCode;
  message: string;
  /** When GitHub's rate limit resets, for `rate_limited` (ISO timestamp). */
  resetAt: string | null;
}

export type CityResult = { ok: true; snapshot: CitySnapshot } | { ok: false; error: CityError };

export const ERROR_STATUS: Readonly<Record<CityErrorCode, number>> = {
  invalid_username: 400,
  not_found: 404,
  rate_limited: 429,
  not_configured: 503,
  upstream: 502,
};

export function cityError(code: CityErrorCode, message: string, resetAt: string | null = null): CityResult {
  return { ok: false, error: { code, message, resetAt } };
}

export function cityApiPath(username: string): string {
  return `/api/city/${encodeURIComponent(username)}`;
}

/** Fetch a city from the GitCity API. Network failures come back as `upstream` errors. */
export async function fetchCity(username: string, signal?: AbortSignal): Promise<CityResult> {
  let response: Response;
  try {
    response = await fetch(cityApiPath(username), { signal });
  } catch (error) {
    if (signal?.aborted) throw error;
    return cityError('upstream', 'Could not reach the GitCity server.');
  }

  const body: unknown = await response.json().catch(() => null);
  if (response.ok && isSnapshot(body)) return { ok: true, snapshot: body };
  if (isErrorBody(body)) return { ok: false, error: body.error };
  return cityError('upstream', `Unexpected response from the server (${response.status}).`);
}

function isSnapshot(body: unknown): body is CitySnapshot {
  return typeof body === 'object' && body !== null && 'owner' in body && 'repos' in body;
}

function isErrorBody(body: unknown): body is { error: CityError } {
  return typeof body === 'object' && body !== null && 'error' in body && typeof (body as { error: { code?: unknown } }).error?.code === 'string';
}
