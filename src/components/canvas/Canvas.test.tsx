import { DndContext } from '@dnd-kit/core';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useEditorStore } from '@/lib/editor/store';
import { components, createNode, createPlaceableNode } from '@/lib/registry';
import { createTheme } from '@/lib/theme';
import type { BuilderNode } from '@/lib/schema';
import { Canvas } from './Canvas';
import { renderers } from './renderers';
import { ROOT_ID, createRoot } from '@/lib/tree';

const renderCanvas = () =>
  render(
    <DndContext>
      <Canvas />
    </DndContext>,
  );

const setRoot = (children: BuilderNode[]) =>
  useEditorStore.setState({
    root: { ...createRoot(), children },
    theme: createTheme(),
    selectedId: null,
  });

beforeEach(() => {
  setRoot([]);
  useEditorStore.setState({ mockData: [] });
});

describe('Canvas', () => {
  it('has a renderer for every registry component', () => {
    for (const meta of components) expect(renderers[meta.name], meta.name).toBeDefined();
  });

  // Renders all ~100 components at once: seconds of work, more on a busy machine.
  it('renders every registry component with its default props', () => {
    setRoot(components.map((meta) => createPlaceableNode(meta.name, meta.name)));
    const { container } = renderCanvas();
    for (const meta of components) {
      expect(
        container.querySelector(`[data-node-id="${meta.name}"] > *`),
        meta.name,
      ).not.toBeNull();
    }
    expect(screen.queryByText(/Unknown component/)).not.toBeInTheDocument();
  }, 30_000);

  it('renders code props such as render functions', () => {
    setRoot([createNode('Transfer', 'tr')]);
    renderCanvas();
    expect(screen.getByText('Item A')).toBeInTheDocument();
    expect(screen.getByText('Item C')).toBeInTheDocument();
  });

  it('remounts components when a default* prop changes', () => {
    setRoot([{ ...createNode('Input', 'in'), props: { defaultValue: 'one' } }]);
    renderCanvas();
    expect(screen.getByDisplayValue('one')).toBeInTheDocument();
    act(() => useEditorStore.getState().updateProps('in', { defaultValue: 'two' }));
    expect(screen.getByDisplayValue('two')).toBeInTheDocument();
  });

  it('shows a drop hint in empty containers', () => {
    renderCanvas();
    expect(screen.getByText('Drop components here')).toBeInTheDocument();
  });

  it('selects the clicked node and highlights it', () => {
    setRoot([{ ...createNode('Card', 'card'), children: [createNode('Button', 'btn')] }]);
    const { container } = renderCanvas();

    fireEvent.click(screen.getByRole('button', { name: 'Button' }));
    expect(useEditorStore.getState().selectedId).toBe('btn');
    expect(container.querySelector('style')?.textContent).toContain('[data-node-id="btn"]');

    fireEvent.click(screen.getByText('Card title'));
    expect(useEditorStore.getState().selectedId).toBe('card');
  });

  it('clears the selection on a click on empty canvas space', () => {
    useEditorStore.setState({ selectedId: ROOT_ID });
    renderCanvas();
    fireEvent.click(screen.getByTestId('canvas'));
    expect(useEditorStore.getState().selectedId).toBeNull();
  });

  it('flags components missing from the registry', () => {
    setRoot([{ id: 'x', component: 'Marquee', props: {}, children: [] }]);
    renderCanvas();
    expect(screen.getByText('Unknown component: Marquee')).toBeInTheDocument();
  });

  it('renders under the project theme', () => {
    useEditorStore.setState({ theme: { mode: 'dark', compact: false, token: {} } });
    renderCanvas();
    // Dark algorithm: colorBgContainer is #141414.
    expect(screen.getByTestId('canvas')).toHaveStyle({ background: 'rgb(20, 20, 20)' });
  });
});

describe('Canvas mock data', () => {
  const bound = (component: string, id: string, props: Record<string, unknown>) => ({
    ...createNode(component, id),
    props,
  });

  it('renders bound props from mock data and follows data edits', () => {
    useEditorStore.setState({
      mockData: [{ id: 'u', name: 'users', data: [{ key: '1', name: 'Ann', age: 31 }] }],
    });
    setRoot([
      bound('Typography.Text', 'text', { children: { $data: 'u', path: '0.name' } }),
      bound('Table', 'table', {
        columns: [{ title: 'Age', dataIndex: 'age', key: 'age' }],
        dataSource: { $data: 'u' },
      }),
    ]);
    renderCanvas();
    expect(screen.getByText('Ann')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '31' })).toBeInTheDocument();

    act(() =>
      useEditorStore
        .getState()
        .updateDataSource('u', { data: [{ key: '1', name: 'Eve', age: 7 }] }),
    );
    expect(screen.getByText('Eve')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '7' })).toBeInTheDocument();
  });

  it('falls back to the default when a binding does not resolve', () => {
    setRoot([bound('Button', 'b', { children: { $data: 'gone' } })]);
    const { container } = renderCanvas();
    expect(container.querySelector('[data-node-id="b"] > button')).toBeInTheDocument();
  });
});
