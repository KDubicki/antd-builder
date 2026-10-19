// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { MAX_PROJECT_BYTES, toProject } from '@/lib/project';
import { LIMITS_PER_MINUTE } from '@/lib/rateLimit';
import { createTheme } from '@/lib/theme';
import { POST } from './route';
import { createRoot } from '@/lib/tree';

const post = (body: string, headers?: Record<string, string>) =>
  POST(new Request('http://localhost/api/export', { method: 'POST', body, headers }));

/** Entry names in a ZIP's central directory. */
function entryNames(zip: Buffer): string[] {
  const end = zip.length - 22;
  let at = zip.readUInt32LE(end + 16);
  const names: string[] = [];
  for (let i = 0; i < zip.readUInt16LE(end + 10); i += 1) {
    const length = zip.readUInt16LE(at + 28);
    names.push(zip.toString('utf8', at + 46, at + 46 + length));
    at += 46 + length;
  }
  return names;
}

describe('POST /api/export', () => {
  it('limits requests per client', async () => {
    const from = (ip: string) =>
      new Request('http://localhost/api/export', {
        method: 'POST',
        body: '{}',
        headers: { 'x-forwarded-for': ip },
      });
    for (let i = 0; i < LIMITS_PER_MINUTE.export; i += 1) {
      expect((await POST(from('198.51.100.1'))).status).not.toBe(429);
    }
    const limited = await POST(from('198.51.100.1'));
    expect(limited.status).toBe(429);
    expect(limited.headers.get('retry-after')).toMatch(/^\d+$/);
    expect((await POST(from('198.51.100.2'))).status).not.toBe(429);
  });

  it('returns the scaffold as a ZIP inside a project folder', async () => {
    const project = toProject({ name: 'My Shop', root: createRoot(), theme: createTheme() });
    const response = await post(JSON.stringify(project));
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/zip');
    expect(response.headers.get('content-disposition')).toBe('attachment; filename="my-shop.zip"');
    const names = entryNames(Buffer.from(await response.arrayBuffer()));
    expect(names).toContain('my-shop/app/page.tsx');
    expect(names.every((name) => name.startsWith('my-shop/'))).toBe(true);
  });

  it('rejects invalid projects', async () => {
    const response = await post('{}');
    expect(response.status).toBe(400);
    expect(((await response.json()) as { error: string }).error).toMatch(/Invalid project/);
  });

  it('rejects projects over the size limit', async () => {
    const response = await post('x'.repeat(MAX_PROJECT_BYTES + 1));
    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: 'The project is larger than 2 MB' });
    const declared = await post('{}', { 'content-length': String(MAX_PROJECT_BYTES + 1) });
    expect(declared.status).toBe(413);
  });
});
