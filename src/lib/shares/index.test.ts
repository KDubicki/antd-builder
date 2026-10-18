// @vitest-environment node
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteShare, isShareId, loadShare, saveShare } from '.';

let dir: string;
const sharesDir = () => path.join(dir, 'nested');

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'shares-'));
  vi.stubEnv('GEMINI_API_KEY', 'key');
  vi.stubEnv('SHARES_DIR', sharesDir());
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(dir, { recursive: true, force: true });
});

describe('saveShare and loadShare', () => {
  it('saves snapshots under new unguessable ids and loads them back', async () => {
    const a = await saveShare('{"a":1}');
    const b = await saveShare('{"b":2}');
    expect(isShareId(a.id)).toBe(true);
    expect(a.id).not.toBe(b.id);
    expect(a.deleteToken).not.toBe(b.deleteToken);
    expect((await loadShare(a.id))?.json).toBe('{"a":1}');
    expect((await loadShare(b.id))?.json).toBe('{"b":2}');
    // A snapshot and its metadata each, no temporary files left behind.
    expect((await readdir(sharesDir())).sort()).toEqual(
      [a, b].flatMap(({ id }) => [`${id}.json`, `${id}.meta.json`]).sort(),
    );
  });

  it('keeps only a hash of the delete token', async () => {
    const { id, deleteToken } = await saveShare('{}');
    const meta = await import('node:fs/promises').then((fs) =>
      fs.readFile(path.join(sharesDir(), `${id}.meta.json`), 'utf8'),
    );
    expect(meta).not.toContain(deleteToken);
    expect(JSON.parse(meta)).toMatchObject({ tokenHash: expect.stringMatching(/^[0-9a-f]{64}$/) });
  });

  it('returns null for unknown or malformed ids without touching other files', async () => {
    expect(await loadShare('A'.repeat(22))).toBeNull();
    for (const id of ['../../etc/passwd', '..%2F..', '', 'a'.repeat(23), `${'a'.repeat(21)}.`]) {
      expect(await loadShare(id), id).toBeNull();
    }
  });

  it('passes on unexpected storage errors', async () => {
    // A directory where the file should be: reading it fails with EISDIR.
    const id = 'B'.repeat(22);
    await mkdir(path.join(sharesDir(), `${id}.json`), { recursive: true });
    await expect(loadShare(id)).rejects.toThrow();
  });
});

describe('expiry', () => {
  it('expires shares after SHARES_TTL_DAYS and deletes them on the next read', async () => {
    vi.stubEnv('SHARES_TTL_DAYS', '7');
    const created = new Date('2026-10-01T12:00:00.000Z');
    const { id, expiresAt } = await saveShare('{}', created);
    expect(expiresAt).toBe('2026-10-08T12:00:00.000Z');

    expect(await loadShare(id, new Date('2026-10-08T11:59:59.000Z'))).toEqual({
      json: '{}',
      expiresAt,
    });
    expect(await loadShare(id, new Date('2026-10-08T12:00:00.000Z'))).toBeNull();
    expect(await readdir(sharesDir())).toEqual([]);
  });

  it('never expires shares saved without metadata', async () => {
    const id = 'D'.repeat(22);
    await mkdir(sharesDir(), { recursive: true });
    await writeFile(path.join(sharesDir(), `${id}.json`), '{}');
    expect(await loadShare(id, new Date('2100-01-01'))).toEqual({ json: '{}', expiresAt: null });
  });
});

describe('deleteShare', () => {
  it('deletes a share with its token, and only with it', async () => {
    const { id, deleteToken } = await saveShare('{}');
    expect(await deleteShare(id, 'wrong')).toBe('forbidden');
    expect(await deleteShare(id, `${deleteToken}x`)).toBe('forbidden');
    expect((await loadShare(id))?.json).toBe('{}');

    expect(await deleteShare(id, deleteToken)).toBe('deleted');
    expect(await loadShare(id)).toBeNull();
    expect(await readdir(sharesDir())).toEqual([]);
    expect(await deleteShare(id, deleteToken)).toBe('not-found');
  });

  it('refuses shares without metadata and unknown ids', async () => {
    const id = 'C'.repeat(22);
    await mkdir(sharesDir(), { recursive: true });
    await writeFile(path.join(sharesDir(), `${id}.json`), '{}');
    expect(await deleteShare(id, 'any')).toBe('forbidden');
    expect(await deleteShare('../x', 'any')).toBe('not-found');
  });
});
