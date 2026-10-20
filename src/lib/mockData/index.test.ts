import { describe, expect, it } from 'vitest';
import { SAMPLE_DATA, createDataSource, sourceNameError, sourceNameFromUrl } from '.';

describe('sourceNameError', () => {
  it('accepts lowercase-first identifiers', () => {
    for (const name of ['users', 'user2', '_raw', '$api', 'orderItems']) {
      expect(sourceNameError(name, []), name).toBeNull();
    }
  });

  it('rejects empty, non-identifier and PascalCase names', () => {
    expect(sourceNameError('', [])).toBe('Enter a name');
    for (const name of ['Users', '2users', 'my users', 'a-b', 'ünï']) {
      expect(sourceNameError(name, []), name).toMatch(/starting with a lowercase letter/);
    }
  });

  it('rejects reserved words, names the export uses and taken names', () => {
    expect(sourceNameError('class', [])).toBe('"class" is reserved');
    expect(sourceNameError('themeConfig', [])).toBe('"themeConfig" is reserved');
    expect(sourceNameError('users', ['users'])).toBe('"users" is already used');
  });
});

describe('createDataSource', () => {
  it('starts with a copy of the sample list', () => {
    const a = createDataSource('a');
    const b = createDataSource('b', { ok: true });
    expect(a).toMatchObject({ name: 'a', data: SAMPLE_DATA });
    expect(a.data).not.toBe(SAMPLE_DATA);
    expect(b.data).toEqual({ ok: true });
    expect(a.id).not.toBe(b.id);
  });
});

describe('sourceNameFromUrl', () => {
  it.each([
    ['https://api.example.com/users', 'users'],
    ['https://api.example.com/v1/user-list/42', 'userList'],
    ['https://example.com/api/orders.json?page=2', 'orders'],
    ['https://example.com/data/top%20products/', 'topProducts'],
    ['https://example.com/Customers', 'customers'],
    ['https://example.com/class', 'classData'],
    ['https://example.com/', 'data'],
    ['https://example.com/api/v2/123', 'data'],
    ['https://example.com/%E0%A4%A', 'data'],
    ['not a url', 'data'],
  ])('names %s %s', (url, name) => {
    expect(sourceNameFromUrl(url)).toBe(name);
  });
});
