// @vitest-environment node
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isShareId, loadShare, saveShare } from '.';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'shares-'));
  vi.stubEnv('GEMINI_API_KEY', 'key');
  vi.stubEnv('SHARES_DIR', path.join(dir, 'nested'));
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(dir, { recursive: true, force: true });
});

describe('shares', () => {
  it('saves snapshots under new unguessable ids and loads them back', async () => {
    const a = await saveShare('{"a":1}');
    const b = await saveShare('{"b":2}');
    expect(isShareId(a)).toBe(true);
    expect(a).not.toBe(b);
    expect(await loadShare(a)).toBe('{"a":1}');
    expect(await loadShare(b)).toBe('{"b":2}');
    // No temporary files are left behind.
    expect((await readdir(path.join(dir, 'nested'))).sort()).toEqual(
      [`${a}.json`, `${b}.json`].sort(),
    );
  });

  it('returns null for unknown or malformed ids without touching other files', async () => {
    expect(await loadShare('A'.repeat(22))).toBeNull();
    for (const id of ['../../etc/passwd', '..%2F..', '', 'a'.repeat(23), `${'a'.repeat(21)}.`]) {
      expect(await loadShare(id), id).toBeNull();
    }
  });

  it('passes on unexpected storage errors', async () => {
    // A directory where the file should be: reading it fails with EISDIR.
    vi.stubEnv('SHARES_DIR', dir);
    const id = 'B'.repeat(22);
    await saveShare('{}'); // creates the folder
    const { mkdir } = await import('node:fs/promises');
    await mkdir(path.join(dir, `${id}.json`));
    await expect(loadShare(id)).rejects.toThrow();
  });
});
