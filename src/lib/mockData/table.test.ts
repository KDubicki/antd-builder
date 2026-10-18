import { describe, expect, it } from 'vitest';
import { columnTitle, planTable } from './table';

describe('columnTitle', () => {
  it.each([
    ['name', 'Name'],
    ['firstName', 'First name'],
    ['created_at', 'Created at'],
    ['user-ID', 'User id'],
    ['HTTPStatus', 'Httpstatus'],
  ])('titles %s as %s', (field, title) => {
    expect(columnTitle(field)).toBe(title);
  });
});

describe('planTable', () => {
  it('makes columns from plain fields, in order of appearance, binding the rows', () => {
    const plan = planTable('s', [
      { key: '1', name: 'Ann', address: { city: 'Oslo' }, tags: ['a'] },
      { key: '2', name: 'Bob', active: true, score: null },
    ]);
    expect(plan).toEqual({
      columns: [
        { title: 'Name', dataIndex: 'name', key: 'name' },
        { title: 'Active', dataIndex: 'active', key: 'active' },
        { title: 'Score', dataIndex: 'score', key: 'score' },
      ],
      dataSource: { $data: 's' },
    });
  });

  it('uses a list inside an object, and id as row key when rows lack key', () => {
    expect(planTable('s', { total: 2, items: [{ id: 1, title: 'A' }, { id: 2 }] })).toEqual({
      columns: [
        { title: 'Id', dataIndex: 'id', key: 'id' },
        { title: 'Title', dataIndex: 'title', key: 'title' },
      ],
      dataSource: { $data: 's', path: 'items' },
      rowKey: 'id',
    });
  });

  it.each([
    ['a number', 42],
    ['null', null],
    ['an empty list', []],
    ['a list of strings', ['a', 'b']],
    ['an object without lists', { total: 1 }],
    ['rows without plain fields', [{ key: '1', nested: {} }]],
  ])('declines %s', (_label, data) => {
    expect(planTable('s', data)).toBeNull();
  });
});
