import { DndContext } from '@dnd-kit/core';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createRoot, useEditorStore } from '@/lib/editor/store';
import { createNode } from '@/lib/registry';
import { Canvas } from './Canvas';
import { CanvasToolbar, viewports } from './CanvasToolbar';

beforeEach(() =>
  useEditorStore.setState({
    root: createRoot(),
    viewport: 'desktop',
    previewMode: false,
    selectedId: null,
  }),
);

const renderEditorArea = () =>
  render(
    <DndContext>
      <CanvasToolbar />
      <Canvas />
    </DndContext>,
  );

describe('CanvasToolbar', () => {
  it('switches the canvas between full width and device widths', () => {
    renderEditorArea();
    const canvas = screen.getByTestId('canvas');
    expect(canvas).toHaveAttribute('data-viewport', 'desktop');
    expect(canvas.style.width).toBe('');

    fireEvent.click(screen.getByText('Mobile'));
    expect(useEditorStore.getState().viewport).toBe('mobile');
    expect(canvas).toHaveAttribute('data-viewport', 'mobile');
    expect(canvas).toHaveStyle({ width: `${viewports.mobile.width}px` });

    fireEvent.click(screen.getByText('Tablet'));
    expect(canvas).toHaveStyle({ width: '768px' });

    fireEvent.click(screen.getByText('Desktop'));
    expect(canvas.style.width).toBe('');
  });

  it('labels each preset with its width', () => {
    renderEditorArea();
    expect(screen.getByTitle('Mobile (375px)')).toBeInTheDocument();
    expect(screen.getByTitle('Tablet (768px)')).toBeInTheDocument();
    expect(screen.getByTitle('Desktop (full width)')).toBeInTheDocument();
  });
});

describe('preview mode', () => {
  it('toggles from the toolbar and clears the selection', () => {
    useEditorStore.setState({
      root: { ...createRoot(), children: [createNode('Button', 'b')] },
      selectedId: 'b',
    });
    renderEditorArea();
    const toggle = screen.getByRole('button', { name: /Preview/ });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(toggle);
    expect(useEditorStore.getState()).toMatchObject({ previewMode: true, selectedId: null });
    expect(screen.getByTestId('canvas')).toHaveAttribute('data-preview', 'true');

    fireEvent.click(screen.getByRole('button', { name: /Exit preview/ }));
    expect(useEditorStore.getState().previewMode).toBe(false);
    expect(screen.getByTestId('canvas')).not.toHaveAttribute('data-preview');
  });

  it('shows the page without editing affordances', () => {
    useEditorStore.setState({
      root: { ...createRoot(), children: [createNode('Card', 'card'), createNode('Button', 'b')] },
      previewMode: true,
    });
    renderEditorArea();
    expect(screen.queryByText('Drop components here')).not.toBeInTheDocument();
    expect(screen.getByText('Card title')).toBeInTheDocument();

    // Clicks reach the components but don't select them.
    fireEvent.click(screen.getByRole('button', { name: 'Button' }));
    expect(useEditorStore.getState().selectedId).toBeNull();
  });

  it('keeps single-child wrappers working when empty', () => {
    useEditorStore.setState({
      root: { ...createRoot(), children: [{ ...createNode('Dropdown', 'd'), children: [] }] },
      previewMode: true,
    });
    const { container } = renderEditorArea();
    expect(container.querySelector('[data-node-id="d"]')).toBeInTheDocument();
  });
});
