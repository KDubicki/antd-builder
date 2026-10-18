import { afterEach, describe, expect, it, vi } from 'vitest';
import { postForFile, postJson } from './apiClient';

const fetchMock = vi.fn<typeof fetch>();

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

const respond = (status: number, body: unknown) =>
  fetchMock.mockResolvedValue(
    new Response(typeof body === 'string' ? body : JSON.stringify(body), { status }),
  );

describe('postJson', () => {
  it('posts the body as JSON and returns the answer', async () => {
    vi.stubGlobal('fetch', fetchMock);
    respond(200, { data: [1] });
    expect(await postJson('/api/x', { url: 'u' })).toEqual({ ok: true, value: { data: [1] } });
    expect(fetchMock).toHaveBeenCalledWith('/api/x', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"url":"u"}',
    });
  });

  it("returns the server's error message", async () => {
    vi.stubGlobal('fetch', fetchMock);
    respond(400, { error: 'Bad URL' });
    expect(await postJson('/api/x', {})).toEqual({ ok: false, error: 'Bad URL' });
  });

  it.each([['not json'], [{ error: 42 }], [null]])(
    'falls back to the status for the body %j',
    async (body) => {
      vi.stubGlobal('fetch', fetchMock);
      respond(500, body);
      expect(await postJson('/api/x', {})).toEqual({ ok: false, error: 'Request failed (500)' });
    },
  );

  it('explains rate limiting without a message from the server', async () => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValueOnce(
      new Response('Too Many Requests', { status: 429, headers: { 'retry-after': '12' } }),
    );
    expect(await postJson('/api/x', {})).toEqual({
      ok: false,
      error: 'Too many requests. Try again in 12 s.',
    });
    fetchMock.mockResolvedValueOnce(new Response('', { status: 429 }));
    expect(await postJson('/api/x', {})).toEqual({
      ok: false,
      error: 'Too many requests. Try again in a minute.',
    });
  });

  it('reports network failures', async () => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    expect(await postJson('/api/x', {})).toEqual({
      ok: false,
      error: "Couldn't reach the server. Check your connection.",
    });
  });
});

describe('postForFile', () => {
  it('returns the answer as a file', async () => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue(
      new Response('PK', { headers: { 'content-type': 'application/zip' } }),
    );
    const result = await postForFile('/api/export', {});
    expect(result.ok && (await result.value.text())).toBe('PK');
  });

  it('returns errors like postJson', async () => {
    vi.stubGlobal('fetch', fetchMock);
    respond(400, { error: 'Invalid project' });
    expect(await postForFile('/api/export', {})).toEqual({ ok: false, error: 'Invalid project' });
  });
});
