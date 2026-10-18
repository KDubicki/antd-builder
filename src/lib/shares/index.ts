import 'server-only';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getServerEnv } from '@/lib/env';

/** 16 random bytes in base64url: unguessable, and safe as a file name. */
const ID_PATTERN = /^[A-Za-z0-9_-]{22}$/;

export function isShareId(id: string): boolean {
  return ID_PATTERN.test(id);
}

/** Stored next to a snapshot. Only a hash of the delete token is kept. */
interface ShareMeta {
  tokenHash: string;
  /** ISO 8601 timestamp. */
  createdAt: string;
}

export interface CreatedShare {
  id: string;
  /** Lets whoever created the share delete it; shown once, never stored in plain text. */
  deleteToken: string;
}

function sharesDir(): string {
  return path.resolve(getServerEnv().SHARES_DIR);
}

/** Paths of a share's files. Only ever called with validated ids, so they can't leave the folder. */
function shareFiles(id: string) {
  const base = path.join(sharesDir(), id);
  return { project: `${base}.json`, meta: `${base}.meta.json` };
}

const hashToken = (token: string) => createHash('sha256').update(token).digest();

/** Writes then renames, so a reader never sees a half-written file. */
async function writeAtomically(file: string, text: string) {
  const temporary = `${file}.${process.pid}.tmp`;
  await writeFile(temporary, text, { encoding: 'utf8', flag: 'wx' });
  await rename(temporary, file);
}

/** `null` for a file that doesn't exist; other errors propagate. */
async function readIfExists(file: string): Promise<string | null> {
  try {
    return await readFile(file, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

async function removeIfExists(file: string) {
  try {
    await unlink(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}

/**
 * Stores a project snapshot (already validated JSON) under a new id. Snapshots are immutable:
 * sharing again creates another link.
 */
export async function saveShare(json: string, now = new Date()): Promise<CreatedShare> {
  const id = randomBytes(16).toString('base64url');
  const deleteToken = randomBytes(24).toString('base64url');
  const files = shareFiles(id);
  const meta: ShareMeta = {
    tokenHash: hashToken(deleteToken).toString('hex'),
    createdAt: now.toISOString(),
  };
  await mkdir(sharesDir(), { recursive: true });
  // Metadata first: a visible snapshot always has it.
  await writeAtomically(files.meta, JSON.stringify(meta));
  await writeAtomically(files.project, json);
  return { id, deleteToken };
}

/** The snapshot's JSON, or `null` when there is none with that id. */
export async function loadShare(id: string): Promise<string | null> {
  if (!isShareId(id)) return null;
  return readIfExists(shareFiles(id).project);
}

/** Deletes a share if `token` is its delete token. */
export async function deleteShare(
  id: string,
  token: string,
): Promise<'deleted' | 'forbidden' | 'not-found'> {
  if (!isShareId(id)) return 'not-found';
  const files = shareFiles(id);
  const [project, metaText] = await Promise.all([
    readIfExists(files.project),
    readIfExists(files.meta),
  ]);
  if (project === null) return 'not-found';
  if (metaText === null) return 'forbidden';

  const expected = Buffer.from((JSON.parse(metaText) as ShareMeta).tokenHash, 'hex');
  const actual = hashToken(token);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return 'forbidden';

  // The snapshot first: once it's gone the link is dead, whatever happens next.
  await removeIfExists(files.project);
  await removeIfExists(files.meta);
  return 'deleted';
}
