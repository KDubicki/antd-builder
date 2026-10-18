import { afterEach, describe, expect, it, vi } from 'vitest';
import { MY_SHARES_KEY, type MyShare, addMyShare, loadMyShares, removeMyShare } from './myShares';

const share = (id: string): MyShare => ({
  id,
  deleteToken: `t-${id}`,
  name: `Project ${id}`,
  createdAt: '2026-10-18T10:00:00.000Z',
});

afterEach(() => vi.restoreAllMocks());

describe('my shares', () => {
  it('adds newest first, replaces by id and removes', () => {
    expect(loadMyShares()).toEqual([]);
    addMyShare(share('a'));
    addMyShare(share('b'));
    expect(loadMyShares().map((s) => s.id)).toEqual(['b', 'a']);
    addMyShare({ ...share('a'), name: 'Renamed' });
    expect(loadMyShares().map((s) => s.name)).toEqual(['Renamed', 'Project b']);
    expect(removeMyShare('a').map((s) => s.id)).toEqual(['b']);
    expect(loadMyShares().map((s) => s.id)).toEqual(['b']);
  });

  it('ignores corrupt storage', () => {
    localStorage.setItem(MY_SHARES_KEY, '{not json');
    expect(loadMyShares()).toEqual([]);
    localStorage.setItem(MY_SHARES_KEY, JSON.stringify({ id: 'x' }));
    expect(loadMyShares()).toEqual([]);
    localStorage.setItem(MY_SHARES_KEY, JSON.stringify([share('a'), { id: 'partial' }, null]));
    expect(loadMyShares()).toEqual([share('a')]);
  });

  it('works without storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(addMyShare(share('a'))).toEqual([share('a')]);
    expect(removeMyShare('a')).toEqual([]);
  });
});
