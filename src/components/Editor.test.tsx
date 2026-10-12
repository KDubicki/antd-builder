import type { DragEndEvent } from '@dnd-kit/core';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ROOT_ID, createRoot, useEditorStore } from '@/lib/editor/store';
import { createNode } from '@/lib/registry';
import { Editor, handleDragEnd } from './Editor';

beforeEach(() =>
  useEditorStore.setState({
    root: createRoot(),
    selectedId: null,
    past: [],
    future: [],
    clipboard: null,
  }),
);

describe('Editor', () => {
  it('renders the app shell with palette and canvas', () => {
    render(<Editor />);
    expect(screen.getByText('antd-builder')).toBeInTheDocument();
    expect(screen.getByLabelText('Component palette')).toBeInTheDocument();
    expect(screen.getByTestId('canvas')).toBeInTheDocument();
  });

  it('deletes the selected node with Delete and clears selection with Escape', () => {
    useEditorStore.setState({
      root: { ...createRoot(), children: [createNode('Tag', 't1'), createNode('Tag', 't2')] },
      selectedId: 't1',
    });
    render(<Editor />);

    fireEvent.keyDown(window, { key: 'Delete' });
    expect(useEditorStore.getState().root.children.map((c) => c.id)).toEqual(['t2']);

    useEditorStore.setState({ selectedId: 't2' });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useEditorStore.getState().selectedId).toBeNull();
  });

  it('does not delete while a side-panel control has focus', () => {
    useEditorStore.setState({
      root: { ...createRoot(), children: [createNode('Button', 'btn')] },
      selectedId: 'btn',
    });
    render(<Editor />);
    fireEvent.keyDown(screen.getByLabelText('Danger'), { key: 'Backspace' });
    expect(useEditorStore.getState().root.children).toHaveLength(1);

    fireEvent.keyDown(screen.getByTestId('canvas'), { key: 'Delete' });
    expect(useEditorStore.getState().root.children).toHaveLength(0);
  });

  it('duplicates the selected node with Ctrl/Cmd+D', () => {
    useEditorStore.setState({
      root: { ...createRoot(), children: [createNode('Tag', 't1')] },
      selectedId: 't1',
    });
    render(<Editor />);

    const event = new KeyboardEvent('keydown', { key: 'd', ctrlKey: true, cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    fireEvent.keyDown(window, { key: 'D', metaKey: true });

    const ids = useEditorStore.getState().root.children.map((c) => c.id);
    expect(ids).toHaveLength(3);
    expect(ids[0]).toBe('t1');
    expect(useEditorStore.getState().selectedId).toBe(ids[2]);
  });

  it('leaves Ctrl/Cmd+D alone without a selection', () => {
    render(<Editor />);
    const event = new KeyboardEvent('keydown', { key: 'd', ctrlKey: true, cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(useEditorStore.getState().root.children).toHaveLength(0);
  });

  it('undoes and redoes with keyboard shortcuts and header buttons', () => {
    render(<Editor />);
    const undo = screen.getByRole('button', { name: 'Undo' });
    const redo = screen.getByRole('button', { name: 'Redo' });
    expect(undo).toBeDisabled();
    expect(redo).toBeDisabled();

    act(() => {
      useEditorStore.getState().addNode('Tag', { parentId: ROOT_ID, index: 0 });
    });
    const children = () => useEditorStore.getState().root.children;
    expect(undo).toBeEnabled();

    const event = new KeyboardEvent('keydown', { key: 'z', metaKey: true, cancelable: true });
    act(() => {
      window.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(true);
    expect(children()).toHaveLength(0);
    expect(redo).toBeEnabled();

    fireEvent.keyDown(window, { key: 'Z', ctrlKey: true, shiftKey: true });
    expect(children()).toHaveLength(1);
    fireEvent.click(undo);
    expect(children()).toHaveLength(0);
    fireEvent.keyDown(window, { key: 'y', ctrlKey: true });
    expect(children()).toHaveLength(1);
    fireEvent.click(undo);
    fireEvent.click(redo);
    expect(children()).toHaveLength(1);
  });

  it('copies, cuts and pastes nodes with keyboard shortcuts', () => {
    useEditorStore.setState({
      root: { ...createRoot(), children: [createNode('Tag', 't1')] },
      selectedId: 't1',
    });
    render(<Editor />);
    const ids = () => useEditorStore.getState().root.children.map((c) => c.id);
    const press = (key: string) => {
      const event = new KeyboardEvent('keydown', { key, ctrlKey: true, cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };

    expect(press('v')).toBe(false); // nothing copied yet: native paste
    expect(press('c')).toBe(true);
    expect(press('v')).toBe(true);
    expect(ids()).toHaveLength(2);

    const pasted = ids()[1]!;
    expect(press('x')).toBe(true);
    expect(ids()).toEqual(['t1']);
    expect(useEditorStore.getState().clipboard?.id).toBe(pasted);
  });

  it('leaves Ctrl/Cmd+C to the browser while page text is highlighted', () => {
    useEditorStore.setState({
      root: { ...createRoot(), children: [createNode('Tag', 't1')] },
      selectedId: 't1',
    });
    render(<Editor />);
    window.getSelection()!.selectAllChildren(screen.getByText('antd-builder'));
    fireEvent.keyDown(window, { key: 'c', metaKey: true });
    expect(useEditorStore.getState().clipboard).toBeNull();
    window.getSelection()!.removeAllRanges();
  });

  it('ignores shortcuts while typing in a field', () => {
    useEditorStore.setState({
      root: { ...createRoot(), children: [createNode('Input', 'in')] },
      selectedId: 'in',
    });
    render(<Editor />);
    fireEvent.keyDown(screen.getByPlaceholderText('Enter text'), { key: 'Backspace' });
    expect(useEditorStore.getState().root.children).toHaveLength(1);

    act(() => useEditorStore.getState().updateProps('in', { placeholder: 'x' }));
    fireEvent.keyDown(screen.getByPlaceholderText('x'), { key: 'z', ctrlKey: true });
    expect(useEditorStore.getState().past).toHaveLength(1);
  });
});

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

  it('moves an existing node', () => {
    useEditorStore.setState({
      root: { ...createRoot(), children: [createNode('Tag', 'a'), createNode('Tag', 'b')] },
    });
    handleDragEnd(dragEnd({ type: 'node', nodeId: 'a', component: 'Tag' }));
    expect(useEditorStore.getState().root.children.map((c) => c.id)).toEqual(['b', 'a']);
  });

  it('does nothing when dropped outside the canvas', () => {
    handleDragEnd(dragEnd({ type: 'palette', component: 'Button' }, false));
    expect(useEditorStore.getState().root.children).toEqual([]);
    expect(useEditorStore.getState().root.id).toBe(ROOT_ID);
  });
});
