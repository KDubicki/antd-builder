import { afterEach, describe, expect, it, vi } from 'vitest';
import { deleteWithToken, postForFile, postJson } from './apiClient';

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
    expect(await postJson('/api/x', {})).toEqual({ ok: false, error: 'Bad URL', status: 400 });
  });

  it.each([['not json'], [{ error: 42 }], [null]])(
    'falls back to the status for the body %j',
    async (body) => {
      vi.stubGlobal('fetch', fetchMock);
      respond(500, body);
      expect(await postJson('/api/x', {})).toEqual({
        ok: false,
        error: 'Request failed (500)',
        status: 500,
      });
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
      status: 429,
    });
    fetchMock.mockResolvedValueOnce(new Response('', { status: 429 }));
    expect(await postJson('/api/x', {})).toEqual({
      ok: false,
      error: 'Too many requests. Try again in a minute.',
      status: 429,
    });
  });

  it('reports network failures', async () => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    expect(await postJson('/api/x', {})).toEqual({
      ok: false,
      error: "Couldn't reach the server. Check your connection.",
      status: 0,
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
    expect(await postForFile('/api/export', {})).toEqual({
      ok: false,
      error: 'Invalid project',
      status: 400,
    });
  });
});

describe('deleteWithToken', () => {
  it('sends the token as a Bearer authorization', async () => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    expect(await deleteWithToken('/api/shares/a', 't0k')).toEqual({ ok: true, value: null });
    expect(fetchMock).toHaveBeenCalledWith('/api/shares/a', {
      method: 'DELETE',
      headers: { authorization: 'Bearer t0k' },
    });
  });

  it('returns errors like the other calls', async () => {
    vi.stubGlobal('fetch', fetchMock);
    respond(403, { error: 'Wrong token' });
    expect(await deleteWithToken('/api/shares/a', 't')).toEqual({
      ok: false,
      error: 'Wrong token',
      status: 403,
    });
  });
});
