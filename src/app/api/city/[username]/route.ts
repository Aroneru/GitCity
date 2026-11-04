import { ERROR_STATUS, cityError } from '@/lib/api';
import { getCitySnapshot } from '@/lib/github';
import { isValidUsername } from '@/lib/username';

/**
 * GET /api/city/[username]: the owner's city snapshot as JSON. The GitHub
 * token never leaves the server; successes are also cached by the CDN.
 */
export async function GET(_request: Request, ctx: RouteContext<'/api/city/[username]'>) {
  const { username } = await ctx.params;
  const result = isValidUsername(username)
    ? await getCitySnapshot(username.toLowerCase())
    : cityError('invalid_username', 'That is not a valid GitHub username.');

  if (result.ok) {
    return Response.json(result.snapshot, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    });
  }
  return Response.json(
    { error: result.error },
    {
      status: ERROR_STATUS[result.error.code],
      // A missing user can be cached briefly; failures must never stick.
      headers: { 'Cache-Control': result.error.code === 'not_found' ? 'public, s-maxage=300' : 'no-store' },
    },
  );
}
