import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RemoteJsonError, fetchJson } from '@/lib/remoteJson';
import { POST } from './route';

vi.mock('@/lib/remoteJson', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/remoteJson')>()),
  fetchJson: vi.fn(),
}));

const post = (body: unknown) =>
  POST(
    new Request('http://localhost/api/data/fetch', {
      method: 'POST',
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('POST /api/data/fetch', () => {
  it.each([[{}], [{ url: '  ' }], ['{not json']])('rejects the body %j', async (body) => {
    expect((await post(body)).status).toBe(400);
    expect(fetchJson).not.toHaveBeenCalled();
  });

  it('returns the fetched data', async () => {
    vi.mocked(fetchJson).mockResolvedValue([{ id: 1 }]);
    const response = await post({ url: ' https://api.example.com/users ' });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [{ id: 1 }] });
    expect(fetchJson).toHaveBeenCalledWith('https://api.example.com/users');
  });

  it('passes on user-facing errors with their status', async () => {
    vi.mocked(fetchJson).mockRejectedValue(new RemoteJsonError("That address isn't allowed", 400));
    const response = await post({ url: 'http://localhost/' });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "That address isn't allowed" });
  });

  it('hides unexpected errors behind a generic 502', async () => {
    vi.mocked(fetchJson).mockRejectedValue(new Error('secret detail'));
    const response = await post({ url: 'https://api.example.com/' });
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'Could not fetch the URL' });
  });
});
