import 'server-only';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getServerEnv } from '@/lib/env';

/** Largest project accepted for sharing, in bytes of JSON. */
export const MAX_SHARE_BYTES = 2 * 1024 * 1024;

/** 16 random bytes in base64url: unguessable, and safe as a file name. */
const ID_PATTERN = /^[A-Za-z0-9_-]{22}$/;

export function isShareId(id: string): boolean {
  return ID_PATTERN.test(id);
}

function sharesDir(): string {
  return path.resolve(getServerEnv().SHARES_DIR);
}

/** Path of a share's file. Only ever called with validated ids, so it can't leave the folder. */
function shareFile(id: string): string {
  return path.join(sharesDir(), `${id}.json`);
}

/**
 * Stores a project snapshot (already validated JSON) and returns its new id. Snapshots are
 * immutable: sharing again creates another link.
 */
export async function saveShare(json: string): Promise<string> {
  const id = randomBytes(16).toString('base64url');
  await mkdir(sharesDir(), { recursive: true });
  // Write then rename, so a reader never sees a half-written file.
  const temporary = `${shareFile(id)}.${process.pid}.tmp`;
  await writeFile(temporary, json, { encoding: 'utf8', flag: 'wx' });
  await rename(temporary, shareFile(id));
  return id;
}

/** The snapshot's JSON, or `null` when there is none with that id. */
export async function loadShare(id: string): Promise<string | null> {
  if (!isShareId(id)) return null;
  try {
    return await readFile(shareFile(id), 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}
