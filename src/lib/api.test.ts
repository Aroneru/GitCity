import { afterEach, describe, expect, it, vi } from 'vitest';
import { cityApiPath, fetchCity } from './api';
import { createDemoSnapshot } from './mock/demo';

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(impl: () => Promise<Response>) {
  const fn = vi.fn(impl);
  vi.stubGlobal('fetch', fn);
  return fn;
}

describe('fetchCity', () => {
  it('requests the encoded API path and returns the snapshot', async () => {
    const snapshot = createDemoSnapshot();
    const fn = stubFetch(async () => Response.json(snapshot));
    await expect(fetchCity('octocat')).resolves.toEqual({ ok: true, snapshot });
    expect(fn.mock.calls[0]).toContain(cityApiPath('octocat'));
  });

  it('passes typed errors through', async () => {
    const error = { code: 'not_found', message: 'No such user', resetAt: null };
    stubFetch(async () => Response.json({ error }, { status: 404 }));
    await expect(fetchCity('ghost')).resolves.toEqual({ ok: false, error });
  });

  it('reports unreadable responses and network failures as upstream errors', async () => {
    stubFetch(async () => new Response('<html>oops</html>', { status: 500 }));
    await expect(fetchCity('octocat')).resolves.toMatchObject({ ok: false, error: { code: 'upstream' } });

    stubFetch(async () => {
      throw new TypeError('Failed to fetch');
    });
    await expect(fetchCity('octocat')).resolves.toMatchObject({ ok: false, error: { code: 'upstream' } });
  });

  it('rethrows when the request was aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    stubFetch(async () => {
      throw new DOMException('Aborted', 'AbortError');
    });
    await expect(fetchCity('octocat', controller.signal)).rejects.toThrow('Aborted');
  });
});
