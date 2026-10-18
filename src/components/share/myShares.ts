/** A link this browser created, with what's needed to delete it later. */
export interface MyShare {
  id: string;
  deleteToken: string;
  /** Project name at the time of sharing. */
  name: string;
  /** ISO 8601 timestamp. */
  createdAt: string;
}

export const MY_SHARES_KEY = 'antd-builder:shares';

function isMyShare(value: unknown): value is MyShare {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Record<string, unknown>;
  return ['id', 'deleteToken', 'name', 'createdAt'].every((key) => typeof entry[key] === 'string');
}

/**
 * Links shared from this browser, newest first. Kept in localStorage: the delete tokens are
 * the only proof of ownership, and the server keeps no list per user.
 */
export function loadMyShares(): MyShare[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(MY_SHARES_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter(isMyShare) : [];
  } catch {
    return [];
  }
}

function save(shares: readonly MyShare[]) {
  try {
    localStorage.setItem(MY_SHARES_KEY, JSON.stringify(shares));
  } catch {
    // Storage unavailable: the list lasts until the page closes.
  }
}

export function addMyShare(share: MyShare): MyShare[] {
  const shares = [share, ...loadMyShares().filter((other) => other.id !== share.id)];
  save(shares);
  return shares;
}

export function removeMyShare(id: string): MyShare[] {
  const shares = loadMyShares().filter((share) => share.id !== id);
  save(shares);
  return shares;
}
