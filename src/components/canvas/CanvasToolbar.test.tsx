import { DndContext } from '@dnd-kit/core';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createRoot, useEditorStore } from '@/lib/editor/store';
import { Canvas } from './Canvas';
import { CanvasToolbar, viewports } from './CanvasToolbar';

beforeEach(() => useEditorStore.setState({ root: createRoot(), viewport: 'desktop' }));

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
