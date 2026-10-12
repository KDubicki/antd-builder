import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTheme } from '@/lib/theme';
import { findNode } from '@/lib/tree';
import { COALESCE_MS, HISTORY_LIMIT, ROOT_ID, createRoot, useEditorStore } from './store';

const state = () => useEditorStore.getState();

beforeEach(() =>
  useEditorStore.setState({
    root: createRoot(),
    theme: createTheme(),
    selectedId: null,
    past: [],
    future: [],
    lastEdit: null,
  }),
);

describe('editor store', () => {
  it('adds a node with default props and selects it', () => {
    const id = state().addNode('Button', { parentId: ROOT_ID, index: 0 });
    expect(findNode(state().root, id)).toMatchObject({
      component: 'Button',
      props: { type: 'primary' },
    });
    expect(state().selectedId).toBe(id);
  });

  it('moves nodes', () => {
    const card = state().addNode('Card', { parentId: ROOT_ID, index: 0 });
    const tag = state().addNode('Tag', { parentId: ROOT_ID, index: 1 });
    state().moveNode(tag, { parentId: card, index: 0 });
    expect(findNode(state().root, card)?.children.map((c) => c.id)).toEqual([tag]);
  });

  it('removes a node and clears a selection inside it', () => {
    const card = state().addNode('Card', { parentId: ROOT_ID, index: 0 });
    state().addNode('Tag', { parentId: card, index: 0 });
    state().removeNode(card);
    expect(state().root.children).toEqual([]);
    expect(state().selectedId).toBeNull();
  });

  it('keeps an unrelated selection when removing', () => {
    const a = state().addNode('Tag', { parentId: ROOT_ID, index: 0 });
    const b = state().addNode('Tag', { parentId: ROOT_ID, index: 1 });
    state().removeNode(a);
    expect(state().selectedId).toBe(b);
  });

  it('never moves or removes the root', () => {
    const before = state().root;
    state().removeNode(ROOT_ID);
    state().moveNode(ROOT_ID, { parentId: ROOT_ID, index: 0 });
    expect(state().root).toBe(before);
  });

  it('duplicates a node after itself and selects the copy', () => {
    const card = state().addNode('Card', { parentId: ROOT_ID, index: 0 });
    state().addNode('Tag', { parentId: card, index: 0 });
    state().duplicateNode(card);
    const [original, copy] = state().root.children;
    expect(original?.id).toBe(card);
    expect(copy?.id).not.toBe(card);
    expect(copy?.component).toBe('Card');
    expect(copy?.children[0]?.component).toBe('Tag');
    expect(state().selectedId).toBe(copy?.id);
  });

  it('does not duplicate the root', () => {
    const before = state().root;
    state().select(ROOT_ID);
    state().duplicateNode(ROOT_ID);
    expect(state().root).toBe(before);
    expect(state().selectedId).toBe(ROOT_ID);
  });

  it('updates props', () => {
    const id = state().addNode('Button', { parentId: ROOT_ID, index: 0 });
    state().updateProps(id, { children: 'Save', type: undefined });
    expect(findNode(state().root, id)?.props).toEqual({ children: 'Save' });
  });

  it('selects and deselects', () => {
    state().select('x');
    expect(state().selectedId).toBe('x');
    state().select(null);
    expect(state().selectedId).toBeNull();
  });

  it('edits and resets the theme', () => {
    state().setThemeMode('dark');
    state().setCompact(true);
    state().setThemeToken('colorPrimary', '#722ed1');
    state().setThemeToken('borderRadius', 4);
    state().setThemeToken('borderRadius', undefined);
    expect(state().theme).toEqual({
      mode: 'dark',
      compact: true,
      token: { colorPrimary: '#722ed1' },
    });
    state().resetTheme();
    expect(state().theme).toEqual(createTheme());
  });

  it('renames and loads projects', () => {
    state().setName('Shop');
    expect(state().name).toBe('Shop');

    const root = {
      ...createRoot(),
      children: [{ id: 't', component: 'Tag', props: {}, children: [] }],
    };
    const theme = { mode: 'dark' as const, compact: false, token: {} };
    state().select('t');
    state().loadProject({ name: 'Loaded', root, theme });
    expect(state()).toMatchObject({ name: 'Loaded', root, theme, selectedId: null });
  });
});

describe('undo/redo', () => {
  afterEach(() => vi.useRealTimers());

  it('undoes and redoes tree edits', () => {
    const empty = state().root;
    const id = state().addNode('Tag', { parentId: ROOT_ID, index: 0 });
    const withTag = state().root;

    state().undo();
    expect(state().root).toBe(empty);
    expect(state().selectedId).toBeNull(); // the selected node no longer exists
    expect(state().future).toHaveLength(1);

    state().redo();
    expect(state().root).toBe(withTag);
    expect(findNode(state().root, id)).toBeDefined();
    expect(state().past).toHaveLength(1);
    expect(state().future).toEqual([]);
  });

  it('keeps the selection when the node survives the undo', () => {
    const id = state().addNode('Button', { parentId: ROOT_ID, index: 0 });
    state().updateProps(id, { danger: true });
    state().undo();
    expect(state().selectedId).toBe(id);
    expect(findNode(state().root, id)?.props.danger).toBeUndefined();
  });

  it('undoes theme edits', () => {
    state().setThemeMode('dark');
    state().setCompact(true);
    state().resetTheme();
    state().undo();
    expect(state().theme).toMatchObject({ mode: 'dark', compact: true });
    state().undo();
    state().undo();
    expect(state().theme).toEqual(createTheme());
  });

  it('does nothing with empty stacks', () => {
    const before = state();
    state().undo();
    state().redo();
    expect(state()).toBe(before);
  });

  it('a new edit clears the redo stack', () => {
    state().addNode('Tag', { parentId: ROOT_ID, index: 0 });
    state().undo();
    state().addNode('Button', { parentId: ROOT_ID, index: 0 });
    expect(state().future).toEqual([]);
  });

  it('does not record no-op edits', () => {
    state().setThemeMode('light');
    state().setCompact(false);
    state().resetTheme();
    state().setThemeToken('borderRadius', undefined);
    state().moveNode('missing', { parentId: ROOT_ID, index: 0 });
    state().updateProps('missing', { a: 1 });
    state().duplicateNode(ROOT_ID);
    expect(state().past).toEqual([]);
  });

  it('coalesces quick edits of the same field into one step', () => {
    vi.useFakeTimers();
    const id = state().addNode('Button', { parentId: ROOT_ID, index: 0 });
    state().updateProps(id, { children: 'S' }, { coalesce: true });
    state().updateProps(id, { children: 'Sa' }, { coalesce: true });
    state().updateProps(id, { children: 'Save' }, { coalesce: true });
    expect(state().past).toHaveLength(2);

    vi.advanceTimersByTime(COALESCE_MS);
    state().updateProps(id, { children: 'Saved' }, { coalesce: true });
    expect(state().past).toHaveLength(3);

    state().undo();
    expect(findNode(state().root, id)?.props.children).toBe('Save');
    state().undo();
    expect(findNode(state().root, id)?.props.children).toBe('Button');
  });

  it('does not coalesce different fields or uncoalesced edits', () => {
    const id = state().addNode('Button', { parentId: ROOT_ID, index: 0 });
    state().updateProps(id, { children: 'A' }, { coalesce: true });
    state().updateProps(id, { href: 'x' }, { coalesce: true });
    state().updateProps(id, { danger: true });
    state().updateProps(id, { danger: undefined });
    state().setThemeToken('borderRadius', 2);
    state().setThemeToken('borderRadius', 4);
    expect(state().past).toHaveLength(6);
  });

  it('caps the history', () => {
    for (let i = 0; i <= HISTORY_LIMIT; i++) state().setThemeMode(i % 2 ? 'light' : 'dark');
    expect(state().past).toHaveLength(HISTORY_LIMIT);
  });

  it('loading a project clears the history', () => {
    state().addNode('Tag', { parentId: ROOT_ID, index: 0 });
    state().undo();
    state().loadProject({ name: 'X', root: createRoot(), theme: createTheme() });
    expect(state()).toMatchObject({ past: [], future: [], lastEdit: null });
  });
});
