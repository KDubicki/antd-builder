import type { DragEndEvent } from '@dnd-kit/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ROOT_ID, createRoot, useEditorStore } from '@/lib/editor/store';
import { createNode } from '@/lib/registry';
import { addAtSelection, handleDragEnd } from './dragDrop';

beforeEach(() =>
  useEditorStore.setState({
    root: createRoot(),
    selectedId: null,
    past: [],
    future: [],
    mockData: [],
  }),
);

describe('handleDragEnd', () => {
  const dragEnd = (data: unknown, over = true): DragEndEvent =>
    ({
      active: { data: { current: data } },
      over: over ? { id: 'canvas' } : null,
      activatorEvent: new MouseEvent('pointerdown', { clientX: 10, clientY: 10 }),
      delta: { x: 5, y: 5 },
    }) as unknown as DragEndEvent;

  beforeEach(() => {
    document.elementsFromPoint = vi.fn(() => []);
  });

  it('adds a palette component where it is dropped', () => {
    handleDragEnd(dragEnd({ type: 'palette', component: 'Button' }));
    expect(document.elementsFromPoint).toHaveBeenCalledWith(15, 15);
    expect(useEditorStore.getState().root.children[0]?.component).toBe('Button');
  });

  it('inserts a dropped block with its data', () => {
    handleDragEnd(dragEnd({ type: 'block', block: 'user-table', component: 'Card' }));
    expect(useEditorStore.getState().root.children[0]?.component).toBe('Card');
    expect(useEditorStore.getState().mockData.map((s) => s.name)).toEqual(['users']);
  });

  it('moves an existing node', () => {
    useEditorStore.setState({
      root: { ...createRoot(), children: [createNode('Tag', 'a'), createNode('Tag', 'b')] },
    });
    handleDragEnd(dragEnd({ type: 'node', nodeId: 'a', component: 'Tag' }));
    expect(useEditorStore.getState().root.children.map((c) => c.id)).toEqual(['b', 'a']);
  });

  it('prefers the tracked pointer position over activator + delta', () => {
    handleDragEnd(dragEnd({ type: 'palette', component: 'Button' }), { x: 300, y: 40 });
    expect(document.elementsFromPoint).toHaveBeenCalledWith(300, 40);
    expect(useEditorStore.getState().root.children[0]?.component).toBe('Button');
  });

  it('does nothing without any drop position', () => {
    handleDragEnd({
      ...dragEnd({ type: 'palette', component: 'Button' }),
      activatorEvent: new KeyboardEvent('keydown'),
    });
    expect(useEditorStore.getState().root.children).toEqual([]);
  });

  it('does nothing when dropped outside the canvas', () => {
    handleDragEnd(dragEnd({ type: 'palette', component: 'Button' }, false));
    expect(useEditorStore.getState().root.children).toEqual([]);
    expect(useEditorStore.getState().root.id).toBe(ROOT_ID);
  });
});

describe('addAtSelection', () => {
  const children = () => useEditorStore.getState().root.children;

  it('adds at the end of the page with nothing selected', () => {
    expect(addAtSelection({ type: 'palette', component: 'Tag' })).toBe(true);
    expect(children().map((c) => c.component)).toEqual(['Tag']);
  });

  it('adds inside a selected container, or after a selected leaf', () => {
    useEditorStore.setState({
      root: {
        ...createRoot(),
        children: [{ ...createNode('Card', 'card'), children: [createNode('Tag', 't')] }],
      },
      selectedId: 'card',
    });
    addAtSelection({ type: 'palette', component: 'Button' });
    expect(children()[0]!.children.map((c) => c.component)).toEqual(['Tag', 'Button']);

    useEditorStore.setState({ selectedId: 't' });
    addAtSelection({ type: 'block', block: 'stats', component: 'Row' });
    expect(children()[0]!.children.map((c) => c.component)).toEqual(['Tag', 'Row', 'Button']);
    expect(useEditorStore.getState().selectedId).toBe(children()[0]!.children[1]!.id);
  });

  it('reports when there is no place for the component', () => {
    expect(addAtSelection({ type: 'palette', component: 'Col' })).toBe(false);
    expect(children()).toEqual([]);
  });
});
