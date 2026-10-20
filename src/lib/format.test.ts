import { describe, expect, it } from 'vitest';
import { formatDateTime, formatDay, uniqueName } from './format';

describe('format', () => {
  const iso = '2026-10-19T09:00:00.000Z';

  it('formats like the browser does for the reader', () => {
    expect(formatDay(iso)).toBe(
      new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' }),
    );
    expect(formatDateTime(iso)).toContain(formatDay(iso));
    expect(formatDateTime(iso).length).toBeGreaterThan(formatDay(iso).length);
  });
});

describe('uniqueName', () => {
  it('numbers taken names', () => {
    expect(uniqueName('Card', [])).toBe('Card');
    expect(uniqueName('Card', ['Card', 'Card 2'])).toBe('Card 3');
    expect(uniqueName('data', ['data', 'data2'], '')).toBe('data3');
  });
});
