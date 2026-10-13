import { describe, expect, it } from 'vitest';
import { SAMPLE_DATA, createDataSource, sourceNameError, uniqueSourceName } from '.';

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

describe('uniqueSourceName', () => {
  it('numbers taken names', () => {
    expect(uniqueSourceName('data', [])).toBe('data');
    expect(uniqueSourceName('data', ['data', 'data2'])).toBe('data3');
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
