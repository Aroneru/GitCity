import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import type { CityResult } from '../api';
import { fetchCitySnapshot } from './client';

/**
 * A city snapshot for a lowercase GitHub login, using the server's token.
 *
 * Cached in the shared remote store (in memory when running locally).
 * Each outcome gets its own lifetime: a city stays fresh for an hour, a
 * missing user for a few minutes, and failures for seconds, so a rate limit
 * or a GitHub hiccup is never served for long.
 */
export async function getCitySnapshot(login: string): Promise<CityResult> {
  'use cache: remote';
  cacheTag(`city:${login}`);

  const result = await fetchCitySnapshot(login, { token: process.env.GITHUB_TOKEN });
  if (result.ok) cacheLife({ stale: 300, revalidate: 3600, expire: 86_400 });
  else if (result.error.code === 'not_found') cacheLife('minutes');
  else cacheLife('seconds');
  return result;
}
