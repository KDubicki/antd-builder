// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createRoot } from '@/lib/editor/store';
import { MAX_PROJECT_BYTES, toProject } from '@/lib/project';
import { createTheme } from '@/lib/theme';
import { POST } from './route';

const post = (body: string) =>
  POST(new Request('http://localhost/api/export', { method: 'POST', body }));

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
    expect((await post('x'.repeat(MAX_PROJECT_BYTES + 1))).status).toBe(413);
  });
});
