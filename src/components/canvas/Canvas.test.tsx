import { DndContext } from '@dnd-kit/core';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
    expect(screen.getByTestId('canvas')).toHaveStyle({ backgroundColor: 'rgb(20, 20, 20)' });
  });
});

describe('Canvas selection', () => {
  // jsdom has no scrollIntoView; the test defines one and puts things back afterwards.
  const { scrollIntoView } = Element.prototype;
  afterEach(() => {
    vi.restoreAllMocks();
    Element.prototype.scrollIntoView = scrollIntoView;
  });

  /** Lays out the scroll area at 0–500px and each node at `tops[id]`, 40px tall. */
  const layOut = (tops: Record<string, number>) => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: Element,
    ) {
      const id = this.parentElement?.getAttribute('data-node-id');
      const top = id && id in tops ? tops[id]! : 0;
      const height = id && id in tops ? 40 : 500;
      return DOMRect.fromRect({ x: 0, y: top, width: 300, height });
    });
    const scrolled: string[] = [];
    Element.prototype.scrollIntoView = vi.fn(function (this: Element) {
      scrolled.push(this.parentElement!.getAttribute('data-node-id')!);
    });
    return scrolled;
  };

  it('outlines the selected component, and the one pointed at in the layers', () => {
    setRoot([createNode('Tag', 'a'), createNode('Tag', 'b')]);
    const { container } = renderCanvas();
    const rules = () => [...container.querySelectorAll('style')].map((el) => el.textContent);
    act(() => useEditorStore.setState({ selectedId: 'a', hoveredId: 'b' }));
    expect(rules()).toEqual([
      expect.stringMatching(/"a"\] > \* \{ outline: 2px solid/),
      expect.stringMatching(/"b"\] > \* \{ outline: 1px dashed/),
    ]);
    // The selection's outline wins over the hover one.
    act(() => useEditorStore.setState({ hoveredId: 'a' }));
    expect(rules()).toHaveLength(1);
    act(() => useEditorStore.setState({ selectedId: null, hoveredId: null }));
    expect(rules()).toEqual([]);
  });

  it('scrolls a selected component into view only when it is out of sight', () => {
    setRoot([createNode('Tag', 'near'), createNode('Tag', 'far')]);
    const scrolled = layOut({ near: 100, far: 2000 });
    render(
      <div>
        <DndContext>
          <Canvas />
        </DndContext>
      </div>,
    );
    act(() => useEditorStore.getState().select('near'));
    expect(scrolled).toEqual([]);
    act(() => useEditorStore.getState().select('far'));
    expect(scrolled).toEqual(['far']);
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
