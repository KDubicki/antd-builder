import { DndContext } from '@dnd-kit/core';
import { render, screen } from '@testing-library/react';
import { resetWarned } from 'antd/es/_util/warning';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { blocks } from '@/lib/blocks';
import { useEditorStore } from '@/lib/editor/store';
import { createTheme } from '@/lib/theme';
import { Canvas } from './Canvas';
import { ROOT_ID, createRoot } from '@/lib/tree';

let warnings: string[] = [];
beforeEach(() => {
  warnings = [];
  resetWarned();
  const record = (...args: unknown[]) => warnings.push(args.map(String).join(' '));
  vi.spyOn(console, 'error').mockImplementation(record);
  vi.spyOn(console, 'warn').mockImplementation(record);
  useEditorStore.setState({ root: createRoot(), theme: createTheme(), mockData: [] });
});
afterEach(() => vi.restoreAllMocks());

describe.each(blocks.map((block) => [block.id] as const))('block %s on the canvas', (id) => {
  it('renders without warnings', () => {
    useEditorStore.getState().insertBlock(id, { parentId: ROOT_ID, index: 0 });
    render(
      <DndContext>
        <Canvas />
      </DndContext>,
    );
    expect(screen.queryByText(/Unknown component/)).not.toBeInTheDocument();
    expect(warnings).toEqual([]);
  });
});

describe('data blocks', () => {
  it('show their mock data', () => {
    useEditorStore.getState().insertBlock('user-table', { parentId: ROOT_ID, index: 0 });
    useEditorStore.getState().insertBlock('stats', { parentId: ROOT_ID, index: 0 });
    render(
      <DndContext>
        <Canvas />
      </DndContext>,
    );
    expect(screen.getByRole('cell', { name: 'Alice Johnson' })).toBeInTheDocument();
    expect(screen.getByText('Orders')).toBeInTheDocument();
    expect(screen.getByText('93')).toBeInTheDocument();
  });
});
