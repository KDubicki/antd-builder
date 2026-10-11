import { DndContext } from '@dnd-kit/core';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { ROOT_ID, createRoot, useEditorStore } from '@/lib/editor/store';
import { components, createNode } from '@/lib/registry';
import { createTheme } from '@/lib/theme';
import type { BuilderNode } from '@/lib/schema';
import { Canvas } from './Canvas';
import { renderers } from './renderers';

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

beforeEach(() => setRoot([]));

describe('Canvas', () => {
  it('has a renderer for every registry component', () => {
    for (const meta of components) expect(renderers[meta.name], meta.name).toBeDefined();
  });

  it('renders every registry component with its default props', () => {
    const containerFor = (name: string) =>
      name === 'Col' ? 'Row' : name === 'Form.Item' ? 'Form' : undefined;
    setRoot(
      components.map((meta) => {
        const parent = containerFor(meta.name);
        const node = createNode(meta.name, meta.name);
        return parent ? { ...createNode(parent, `${meta.name}-parent`), children: [node] } : node;
      }),
    );
    const { container } = renderCanvas();
    for (const meta of components) {
      expect(
        container.querySelector(`[data-node-id="${meta.name}"] > *`),
        meta.name,
      ).not.toBeNull();
    }
    expect(screen.queryByText(/Unknown component/)).not.toBeInTheDocument();
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
