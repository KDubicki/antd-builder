// @vitest-environment node
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot } from '@/lib/editor/store';
import { MAX_PROJECT_BYTES, toProject } from '@/lib/project';
import { LIMITS_PER_MINUTE } from '@/lib/rateLimit';
import { saveShare } from '@/lib/shares';
import { createTheme } from '@/lib/theme';
import { DELETE, GET } from './[id]/route';
import { POST } from './route';

vi.mock('@/lib/shares', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/shares')>();
  return { ...actual, saveShare: vi.fn(actual.saveShare) };
});

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'shares-route-'));
  vi.stubEnv('GEMINI_API_KEY', 'key');
  vi.stubEnv('SHARES_DIR', dir);
});

afterEach(async () => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  await rm(dir, { recursive: true, force: true });
});

const project = () => ({
  ...toProject({ name: 'Shop', root: createRoot(), theme: createTheme() }),
  versions: [
    {
      id: 'v',
      name: 'Draft',
      createdAt: '2026-01-01T00:00:00.000Z',
      root: createRoot(),
      theme: createTheme(),
      mockData: [],
      customBlocks: [],
    },
  ],
});

const post = (body: string, headers: Record<string, string> = {}) =>
  POST(new Request('http://localhost/api/shares', { method: 'POST', body, headers }));

const get = (id: string) =>
  GET(new Request(`http://localhost/api/shares/${id}`), { params: Promise.resolve({ id }) });

const del = (id: string, headers: Record<string, string> = {}) =>
  DELETE(new Request(`http://localhost/api/shares/${id}`, { method: 'DELETE', headers }), {
    params: Promise.resolve({ id }),
  });

describe('POST /api/shares', () => {
  it('limits requests per client', async () => {
    const from = (ip: string) =>
      new Request('http://localhost/api/shares', {
        method: 'POST',
        body: '{}',
        headers: { 'x-forwarded-for': ip },
      });
    for (let i = 0; i < LIMITS_PER_MINUTE.share; i += 1) {
      expect((await POST(from('198.51.100.1'))).status).not.toBe(429);
    }
    const limited = await POST(from('198.51.100.1'));
    expect(limited.status).toBe(429);
    expect(limited.headers.get('retry-after')).toMatch(/^\d+$/);
    expect((await POST(from('198.51.100.2'))).status).not.toBe(429);
  });

  it('stores a snapshot without the version history and serves it back', async () => {
    const response = await post(JSON.stringify(project()));
    expect(response.status).toBe(201);
    const { id, deleteToken, expiresAt } = (await response.json()) as {
      id: string;
      deleteToken: string;
      expiresAt: string;
    };
    expect(deleteToken).toMatch(/^[A-Za-z0-9_-]{32}$/);
    const days = (new Date(expiresAt).getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(29.9);
    expect(days).toBeLessThanOrEqual(30);

    const shared = await get(id);
    expect(shared.status).toBe(200);
    expect(shared.headers.get('content-type')).toBe('application/json');
    expect(shared.headers.get('expires')).toBe(new Date(expiresAt).toUTCString());
    const body = (await shared.json()) as ReturnType<typeof project>;
    expect(body.name).toBe('Shop');
    expect(body.versions).toEqual([]);
  });

  it('rejects files that are not valid projects', async () => {
    const response = await post('{"version": 2}');
    expect(response.status).toBe(400);
    expect(((await response.json()) as { error: string }).error).toMatch(/Invalid project file/);
  });

  it('rejects projects over the size limit', async () => {
    const declared = await post('{}', { 'content-length': String(MAX_PROJECT_BYTES + 1) });
    expect(declared.status).toBe(413);
    const big = { ...project(), name: 'x'.repeat(MAX_PROJECT_BYTES) };
    expect((await post(JSON.stringify(big))).status).toBe(413);
  });

  it('reports storage failures without details', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(saveShare).mockRejectedValueOnce(new Error('EACCES /secret/path'));
    const response = await post(JSON.stringify(project()));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Could not save the shared project' });
  });
});

describe('GET /api/shares/[id]', () => {
  it('answers 404 for unknown and malformed ids', async () => {
    expect((await get('A'.repeat(22))).status).toBe(404);
    expect((await get('..%2F..%2Fpackage')).status).toBe(404);
  });
});

describe('DELETE /api/shares/[id]', () => {
  const create = async () =>
    (await (await post(JSON.stringify(project()))).json()) as { id: string; deleteToken: string };

  it('deletes with the Bearer delete token', async () => {
    const { id, deleteToken } = await create();
    expect((await del(id)).status).toBe(401);
    expect((await del(id, { authorization: 'Bearer nope' })).status).toBe(403);
    expect((await get(id)).status).toBe(200);

    const deleted = await del(id, { authorization: `Bearer ${deleteToken}` });
    expect(deleted.status).toBe(204);
    expect((await get(id)).status).toBe(404);
    expect((await del(id, { authorization: `Bearer ${deleteToken}` })).status).toBe(404);
  });

  it('limits requests per client', async () => {
    const headers = { authorization: 'Bearer x', 'x-forwarded-for': '198.51.100.3' };
    for (let i = 0; i < LIMITS_PER_MINUTE.shareDelete; i += 1) {
      expect((await del('A'.repeat(22), headers)).status).toBe(404);
    }
    expect((await del('A'.repeat(22), headers)).status).toBe(429);
  });
});
