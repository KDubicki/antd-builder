import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useEditorStore } from '@/lib/editor/store';
import { createNode } from '@/lib/registry';
import type { DataSource } from '@/lib/schema';
import { createRoot, findNode } from '@/lib/tree';
import { Inspector } from './Inspector';

const users: DataSource = {
  id: 'u',
  name: 'users',
  data: [
    { key: '1', name: 'Ann', age: 31 },
    { key: '2', name: 'Bob', age: 45 },
  ],
};
const stats: DataSource = { id: 's', name: 'stats', data: { total: 7 } };

const propsOf = (id: string) => findNode(useEditorStore.getState().root, id)?.props;

function selectNew(component: string, mockData: DataSource[], props?: Record<string, unknown>) {
  const node = createNode(component, 'n');
  useEditorStore.setState({
    root: { ...createRoot(), children: [{ ...node, props: { ...node.props, ...props } }] },
    selectedId: 'n',
    mockData,
    past: [],
    future: [],
    lastEdit: null,
  });
  render(<Inspector />);
}

beforeEach(() => useEditorStore.setState({ mockData: [] }));

describe('Inspector data bindings', () => {
  it('offers binding only once the project has mock data', () => {
    selectNew('Typography.Text', []);
    expect(screen.queryByRole('button', { name: /to mock data/ })).not.toBeInTheDocument();
    act(() => useEditorStore.setState({ mockData: [users] }));
    expect(screen.getByRole('button', { name: 'Bind Text to mock data' })).toBeInTheDocument();
  });

  it('binds a text prop to the first fitting path and previews the value', () => {
    selectNew('Typography.Text', [users]);
    fireEvent.click(screen.getByRole('button', { name: 'Bind Text to mock data' }));
    // The whole list doesn't fit a text prop; the first text value does.
    expect(propsOf('n')?.children).toEqual({ $data: 'u', path: '0.key' });
    expect(screen.getByText('= "1"')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Text path'), { target: { value: '1.name' } });
    expect(propsOf('n')?.children).toEqual({ $data: 'u', path: '1.name' });
    expect(screen.getByText('= "Bob"')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Text path'), { target: { value: '' } });
    expect(screen.getByText('Expected text, got a list')).toBeInTheDocument();
  });

  it('prefers text over numbers shown as text', () => {
    const counts: DataSource = { id: 'c', name: 'counts', data: { total: 3, label: 'Total' } };
    selectNew('Typography.Text', [counts]);
    fireEvent.click(screen.getByRole('button', { name: 'Bind Text to mock data' }));
    expect(propsOf('n')?.children).toEqual({ $data: 'c', path: 'label' });
  });

  it('binds a JSON prop to the whole response', () => {
    selectNew('Table', [users]);
    fireEvent.click(screen.getByRole('button', { name: 'Bind Rows to mock data' }));
    expect(propsOf('n')?.dataSource).toEqual({ $data: 'u' });
    expect(screen.getByLabelText('Rows path')).toHaveValue('');
  });

  it('switches data source, keeping to paths that fit', () => {
    selectNew('Statistic', [users, stats], { value: { $data: 'u', path: '0.age' } });
    const picker = screen.getByLabelText('Value data source');
    fireEvent.mouseDown(picker);
    fireEvent.click(screen.getByTitle('stats'));
    expect(propsOf('n')?.value).toEqual({ $data: 's', path: 'total' });
    expect(screen.getByText('= 7')).toBeInTheDocument();
  });

  it('flags bindings to deleted data sources and unbinds back to the default', () => {
    selectNew('Typography.Text', [users], { children: { $data: 'gone' } });
    expect(screen.getByText('Its data source was deleted')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Unbind Text' }));
    expect(propsOf('n')).not.toHaveProperty('children');
    expect(screen.getByLabelText('Text')).toBeInTheDocument();
  });
});
