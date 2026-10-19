import { describe, expect, it } from 'vitest';
import { getComponentMeta } from '@/lib/registry';
import { matchesQuery } from '.';

describe('matchesQuery', () => {
  const button = getComponentMeta('Button')!;

  it('matches everything for an empty or blank query', () => {
    expect(matchesQuery(button, '')).toBe(true);
    expect(matchesQuery(button, '   ')).toBe(true);
  });

  it('matches label, name and description terms, ignoring case', () => {
    expect(matchesQuery(button, 'BUTTON')).toBe(true);
    expect(matchesQuery(getComponentMeta('Input.Search')!, 'input search')).toBe(true);
    expect(matchesQuery(button, button.description.split(' ')[0]!)).toBe(true);
  });

  it('requires every term to match', () => {
    expect(matchesQuery(button, 'button zzz')).toBe(false);
  });
});
