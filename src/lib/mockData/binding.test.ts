import { describe, expect, it } from 'vitest';
import type { PropDefinition } from '@/lib/registry';
import type { DataSource } from '@/lib/schema';
import { isBinding, kindOf, pathSegments, readPath, resolveBinding, resolveProps } from '.';

const sources: DataSource[] = [
  {
    id: 'u',
    name: 'users',
    data: [
      { name: 'Ann', age: 31, admin: true, role: 'primary', tags: ['a'] },
      { name: 'Bob', age: null },
    ],
  },
  { id: 's', name: 'stats', data: { meta: { total: 42 }, 'odd key': 'x' } },
  { id: 'n', name: 'nothing', data: null },
];

const text: PropDefinition = { type: 'string', label: 'Text' };
const num: PropDefinition = { type: 'number', label: 'Number' };
const bool: PropDefinition = { type: 'boolean', label: 'Flag' };
const kind: PropDefinition = { type: 'enum', label: 'Type', options: ['primary', 'dashed'] };
const json: PropDefinition = { type: 'json', label: 'Items' };

describe('bindings', () => {
  it('recognizes binding objects only', () => {
    expect(isBinding({ $data: 'u' })).toBe(true);
    expect(isBinding({ $data: 'u', path: '0' })).toBe(true);
    for (const value of [null, 'u', [{ $data: 'u' }], { $data: 1 }, { data: 'u' }]) {
      expect(isBinding(value), JSON.stringify(value)).toBe(false);
    }
  });

  it('splits and reads dot paths through objects and arrays', () => {
    expect(pathSegments(' 0 . name ')).toEqual(['0', 'name']);
    expect(pathSegments('')).toEqual([]);
    expect(pathSegments(undefined)).toEqual([]);
    expect(readPath(sources[0]!.data, '0.name')).toBe('Ann');
    expect(readPath(sources[1]!.data, 'meta.total')).toBe(42);
    expect(readPath(sources[0]!.data, '')).toBe(sources[0]!.data);
    expect(readPath(sources[0]!.data, '5.name')).toBeUndefined();
    expect(readPath(sources[0]!.data, '0.name.length')).toBeUndefined();
    expect(readPath(sources[0]!.data, 'length')).toBe(2); // arrays' own length
    expect(readPath({}, 'toString')).toBeUndefined(); // inherited properties don't count
  });

  it('describes value kinds', () => {
    expect([[], null, 'a', 1, true, {}].map(kindOf)).toEqual([
      'a list',
      'null',
      'text',
      'a number',
      'true/false',
      'an object',
    ]);
  });
});

describe('resolveBinding', () => {
  const resolve = (path: string, def?: PropDefinition, id = 'u') =>
    resolveBinding({ $data: id, path }, def, sources);

  it('passes values that fit the prop', () => {
    expect(resolve('0.name', text)).toEqual({ ok: true, value: 'Ann', converted: false });
    expect(resolve('0.age', num)).toMatchObject({ ok: true, value: 31 });
    expect(resolve('0.admin', bool)).toMatchObject({ ok: true, value: true });
    expect(resolve('0.role', kind)).toMatchObject({ ok: true, value: 'primary' });
    expect(resolve('', json)).toMatchObject({ ok: true, value: sources[0]!.data });
    expect(resolve('0.tags')).toMatchObject({ ok: true, value: ['a'] });
  });

  it('shows numbers and true/false as text in text props', () => {
    expect(resolve('0.age', text)).toEqual({ ok: true, value: '31', converted: true });
    expect(resolve('0.admin', text)).toEqual({ ok: true, value: 'true', converted: true });
  });

  it('explains mismatches and missing data', () => {
    const error = (path: string, def?: PropDefinition, id?: string) => {
      const result = resolve(path, def, id);
      return result.ok ? null : result.error;
    };
    expect(error('', text)).toBe('Expected text, got a list');
    expect(error('0.name', num)).toBe('Expected a number, got text');
    expect(error('0.name', bool)).toBe('Expected true/false, got text');
    expect(error('0.name', kind)).toBe('Expected one of primary, dashed');
    expect(error('1.age', json)).toBe('No value at "1.age"');
    expect(error('9', json)).toBe('No value at "9"');
    expect(error('', json, 'n')).toBe('The response is empty');
    expect(error('', json, 'gone')).toBe('Its data source was deleted');
  });
});

describe('resolveProps', () => {
  const defs = { title: text, items: json };

  it('returns the same object when nothing is bound', () => {
    const props = { title: 'Hi' };
    expect(resolveProps(props, defs, sources)).toBe(props);
  });

  it('replaces bindings and leaves out the ones that do not resolve', () => {
    const props = {
      title: { $data: 's', path: 'meta.total' },
      items: { $data: 'gone' },
      size: 'small',
    };
    expect(resolveProps(props, defs, sources)).toEqual({ title: '42', size: 'small' });
  });
});
