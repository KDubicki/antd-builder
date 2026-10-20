import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useEditorStore } from '@/lib/editor/store';
import { createNode } from '@/lib/registry';
import { Editor } from './Editor';
import { ROOT_ID, createRoot } from '@/lib/tree';

beforeEach(() =>
  useEditorStore.setState({
    root: createRoot(),
    selectedId: null,
    past: [],
    future: [],
    clipboard: null,
    shortcutHelpOpen: false,
    previewMode: false,
    versions: [],
  }),
);

describe('Editor', () => {
  it('renders the app shell with palette and canvas', () => {
    render(<Editor />);
    expect(screen.getByText('antd-builder')).toBeInTheDocument();
    expect(screen.getByLabelText('Component palette')).toBeInTheDocument();
    expect(screen.getByTestId('canvas')).toBeInTheDocument();
  });

  it('puts the header controls on a light background, like their default styling', () => {
    render(<Editor />);
    const header = screen.getByText('antd-builder').closest('header')!;
    expect(header).toHaveStyle({ background: '#ffffff' });
    expect(header).toContainElement(screen.getByLabelText('Project name'));
  });

  it('keeps drag auto-scroll away from the palette', () => {
    render(<Editor />);
    const scroller = screen.getByLabelText('Component palette').closest('[data-palette-scroller]');
    expect(scroller).toHaveClass('ant-layout-sider');
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

  it('moves the selected node with Alt+Arrow keys', () => {
    useEditorStore.setState({
      root: { ...createRoot(), children: [createNode('Tag', 't1'), createNode('Tag', 't2')] },
      selectedId: 't1',
    });
    render(<Editor />);
    const order = () => useEditorStore.getState().root.children.map((c) => c.id);

    const event = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      altKey: true,
      cancelable: true,
    });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(order()).toEqual(['t2', 't1']);

    fireEvent.keyDown(window, { key: 'ArrowUp', altKey: true });
    expect(order()).toEqual(['t1', 't2']);

    act(() => useEditorStore.setState({ selectedId: null }));
    const idle = new KeyboardEvent('keydown', { key: 'ArrowUp', altKey: true, cancelable: true });
    window.dispatchEvent(idle);
    expect(idle.defaultPrevented).toBe(false);
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
    expect(undo).toHaveAttribute('title', 'Undo Add Tag (Ctrl/⌘+Z)');
    expect(redo).toHaveAttribute('title', 'Redo (Ctrl/⌘+Shift+Z)');

    const event = new KeyboardEvent('keydown', { key: 'z', metaKey: true, cancelable: true });
    act(() => {
      window.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(true);
    expect(children()).toHaveLength(0);
    expect(redo).toBeEnabled();
    expect(redo).toHaveAttribute('title', 'Redo Add Tag (Ctrl/⌘+Shift+Z)');

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

  it('walks up and down the page with Shift+Enter and Enter', () => {
    useEditorStore.setState({
      root: {
        ...createRoot(),
        children: [{ ...createNode('Card', 'card'), children: [createNode('Tag', 't')] }],
      },
      selectedId: 't',
    });
    render(<Editor />);
    const selected = () => useEditorStore.getState().selectedId;
    fireEvent.keyDown(document.body, { key: 'Enter', shiftKey: true });
    expect(selected()).toBe('card');
    fireEvent.keyDown(document.body, { key: 'Enter', shiftKey: true });
    expect(selected()).toBe(ROOT_ID);
    fireEvent.keyDown(document.body, { key: 'Enter' });
    expect(selected()).toBe('card');
    fireEvent.keyDown(document.body, { key: 'Enter' });
    expect(selected()).toBe('t');
    fireEvent.keyDown(document.body, { key: 'Enter' }); // a leaf: nothing inside
    expect(selected()).toBe('t');

    // Enter on a focused button presses the button instead.
    const undo = screen.getByRole('button', { name: 'Undo' });
    fireEvent.keyDown(undo, { key: 'Enter', shiftKey: true });
    expect(selected()).toBe('t');
  });

  it('selects the previous and next sibling with the arrow keys', () => {
    useEditorStore.setState({
      root: { ...createRoot(), children: [createNode('Tag', 'a'), createNode('Tag', 'b')] },
      selectedId: 'a',
    });
    render(<Editor />);
    const selected = () => useEditorStore.getState().selectedId;
    fireEvent.keyDown(document.body, { key: 'ArrowDown' });
    expect(selected()).toBe('b');
    fireEvent.keyDown(document.body, { key: 'ArrowDown' }); // the last one stays selected
    expect(selected()).toBe('b');
    fireEvent.keyDown(document.body, { key: 'ArrowUp' });
    expect(selected()).toBe('a');

    // Arrows in a focused control (a menu, a list) stay with it.
    fireEvent.keyDown(screen.getByRole('button', { name: 'Undo' }), { key: 'ArrowDown' });
    expect(selected()).toBe('a');
  });

  it('saves a version with Ctrl/Cmd+S and says so', async () => {
    render(<Editor />);
    fireEvent.keyDown(window, { key: 's', metaKey: true });
    expect(useEditorStore.getState().versions.map((version) => version.name)).toEqual([
      'Version 1',
    ]);
    expect(await screen.findByText('Saved "Version 1"')).toBeInTheDocument();
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

  it('opens the shortcut reference with ? and the header button', () => {
    render(<Editor />);
    fireEvent.keyDown(window, { key: '?', shiftKey: true });
    const dialog = screen.getByRole('dialog', { name: 'Keyboard shortcuts' });
    expect(within(dialog).getByText('Duplicate the selected component')).toBeInTheDocument();

    act(() => useEditorStore.getState().setShortcutHelpOpen(false));
    fireEvent.click(screen.getByRole('button', { name: 'Keyboard shortcuts' }));
    expect(useEditorStore.getState().shortcutHelpOpen).toBe(true);
  });

  it('keeps editor shortcuts out of its own dialogs but not canvas previews', () => {
    useEditorStore.setState({
      root: { ...createRoot(), children: [createNode('Modal', 'm')] },
      selectedId: 'm',
      shortcutHelpOpen: true,
    });
    render(<Editor />);
    const dialog = screen.getByRole('dialog', { name: 'Keyboard shortcuts' });
    fireEvent.keyDown(dialog, { key: 'Delete' });
    expect(useEditorStore.getState().root.children).toHaveLength(1);

    // The Modal preview on the canvas is a dialog panel too, but a canvas node.
    const preview = screen.getByTestId('canvas').querySelector('[aria-modal="true"]')!;
    fireEvent.keyDown(preview, { key: 'Delete' });
    expect(useEditorStore.getState().root.children).toHaveLength(0);
  });

  it('hides the side panels in preview and leaves it with Escape', () => {
    useEditorStore.setState({
      root: { ...createRoot(), children: [createNode('Tag', 't1')] },
      selectedId: 't1',
    });
    render(<Editor />);
    const palette = screen.getByLabelText('Component palette').closest('.ant-layout-sider');
    fireEvent.click(screen.getByRole('button', { name: /Preview/ }));
    expect(palette).toHaveStyle({ display: 'none' });

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useEditorStore.getState().previewMode).toBe(false);
    expect(palette).not.toHaveStyle({ display: 'none' });
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
