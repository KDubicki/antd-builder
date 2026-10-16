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
    clipboard: null,
    mockData: [],
    customBlocks: [],
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

  it('nudges nodes among their siblings as undoable steps', () => {
    const a = state().addNode('Tag', { parentId: ROOT_ID, index: 0 });
    const b = state().addNode('Tag', { parentId: ROOT_ID, index: 1 });
    const order = () => state().root.children.map((c) => c.id);
    const steps = state().past.length;

    state().nudgeNode(b, -1);
    expect(order()).toEqual([b, a]);
    state().nudgeNode(b, -1); // already first: no-op, not recorded
    expect(state().past).toHaveLength(steps + 1);

    state().undo();
    expect(order()).toEqual([a, b]);
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

describe('copy/cut/paste', () => {
  it('pastes a fresh copy after a non-container selection', () => {
    const tag = state().addNode('Tag', { parentId: ROOT_ID, index: 0 });
    state().updateProps(tag, { children: 'Hot' });
    state().copyNode(tag);
    state().updateProps(tag, { children: 'Changed' }); // the clipboard is a snapshot

    const first = state().pasteNode();
    const second = state().pasteNode();
    expect(state().root.children.map((c) => c.id)).toEqual([tag, first, second]);
    expect(first).not.toBe(second);
    expect(findNode(state().root, first!)?.props.children).toBe('Hot');
    expect(state().selectedId).toBe(second);
  });

  it('pastes into a selected container that accepts the node', () => {
    const tag = state().addNode('Tag', { parentId: ROOT_ID, index: 0 });
    const card = state().addNode('Card', { parentId: ROOT_ID, index: 1 });
    state().copyNode(tag);
    state().select(card);
    const pasted = state().pasteNode();
    expect(findNode(state().root, card)?.children.map((c) => c.id)).toEqual([pasted]);
  });

  it('pastes onto the page when nothing (or a stale node) is selected', () => {
    const tag = state().addNode('Tag', { parentId: ROOT_ID, index: 0 });
    state().copyNode(tag);
    state().select(null);
    const a = state().pasteNode();
    state().select('gone');
    const b = state().pasteNode();
    expect(state().root.children.map((c) => c.id)).toEqual([tag, a, b]);
  });

  it('copies subtrees with fresh ids throughout', () => {
    const card = state().addNode('Card', { parentId: ROOT_ID, index: 0 });
    const inner = state().addNode('Tag', { parentId: card, index: 0 });
    state().copyNode(card);
    state().select(null);
    const pastedId = state().pasteNode();
    const pasted = findNode(state().root, pastedId!);
    expect(pasted?.children).toHaveLength(1);
    expect(pasted?.children[0]?.id).not.toBe(inner);
  });

  it('respects nesting rules and does nothing without a valid spot', () => {
    const row = state().addNode('Row', { parentId: ROOT_ID, index: 0 });
    const col = state().addNode('Col', { parentId: row, index: 0 });
    state().copyNode(col);
    state().select(null);
    const before = state().root;
    expect(state().pasteNode()).toBeNull(); // a column can't go on the page
    expect(state().root).toBe(before);

    state().select(col); // ...but next to another column it can
    const pasted = state().pasteNode();
    expect(findNode(state().root, row)?.children.map((c) => c.id)).toEqual([col, pasted]);
  });

  it('cuts a node in one undo step', () => {
    const tag = state().addNode('Tag', { parentId: ROOT_ID, index: 0 });
    state().cutNode(tag);
    expect(state().root.children).toEqual([]);
    expect(state().clipboard?.id).toBe(tag);
    state().undo();
    expect(state().root.children.map((c) => c.id)).toEqual([tag]);
  });

  it('ignores the root, missing nodes and an empty clipboard', () => {
    expect(state().pasteNode()).toBeNull();
    state().copyNode(ROOT_ID);
    state().copyNode('missing');
    state().cutNode(ROOT_ID);
    expect(state().clipboard).toBeNull();
    expect(state().past).toEqual([]);
  });
});

describe('mock data', () => {
  const sources = () => state().mockData;

  it('adds data sources with free names and sample data', () => {
    const a = state().addDataSource();
    const b = state().addDataSource();
    const c = state().addDataSource('users');
    expect(sources().map((s) => s.name)).toEqual(['data', 'data2', 'users']);
    expect(sources().map((s) => s.id)).toEqual([a, b, c]);
    expect(Array.isArray(sources()[0]?.data)).toBe(true);
  });

  it('renames only to valid, free names', () => {
    const a = state().addDataSource('users');
    state().addDataSource('orders');
    state().updateDataSource(a, { name: 'customers' });
    expect(sources()[0]?.name).toBe('customers');
    state().updateDataSource(a, { name: 'orders' });
    state().updateDataSource(a, { name: 'Bad Name' });
    state().updateDataSource('missing', { name: 'x' });
    expect(sources().map((s) => s.name)).toEqual(['customers', 'orders']);
  });

  it('edits, removes and undoes data changes', () => {
    const a = state().addDataSource();
    state().updateDataSource(a, { data: { total: 1 } });
    expect(sources()[0]?.data).toEqual({ total: 1 });
    const steps = state().past.length;
    state().updateDataSource(a, { data: { total: 1 } }); // unchanged: not recorded
    expect(state().past).toHaveLength(steps);

    state().removeDataSource(a);
    state().removeDataSource(a);
    expect(sources()).toEqual([]);
    state().undo();
    expect(sources()[0]?.data).toEqual({ total: 1 });
    state().undo();
    expect(Array.isArray(sources()[0]?.data)).toBe(true);
  });

  it('coalesces typing in the data editor', () => {
    const a = state().addDataSource();
    const steps = state().past.length;
    state().updateDataSource(a, { data: [1] }, { coalesce: true });
    state().updateDataSource(a, { data: [1, 2] }, { coalesce: true });
    expect(state().past).toHaveLength(steps + 1);
  });

  it('loads mock data with a project and defaults to none', () => {
    const mockData = [{ id: 'd', name: 'users', data: [] }];
    state().loadProject({ name: 'P', root: createRoot(), theme: createTheme(), mockData });
    expect(sources()).toEqual(mockData);
    state().loadProject({ name: 'P', root: createRoot(), theme: createTheme() });
    expect(sources()).toEqual([]);
  });
});

describe('editor UI state', () => {
  it('clears the selection when entering preview, without touching history', () => {
    const id = state().addNode('Tag', { parentId: ROOT_ID, index: 0 });
    const steps = state().past.length;
    state().setPreviewMode(true);
    expect(state()).toMatchObject({ previewMode: true, selectedId: null });
    state().setPreviewMode(false);
    expect(state().previewMode).toBe(false);
    state().setViewport('mobile');
    expect(state().viewport).toBe('mobile');
    expect(state().past).toHaveLength(steps);
    expect(findNode(state().root, id)).toBeDefined();
  });
});

describe('custom blocks', () => {
  const blocks = () => state().customBlocks;

  it('saves a snapshot of a subtree under a unique name', () => {
    const card = state().addNode('Card', { parentId: ROOT_ID, index: 0 });
    state().addNode('Button', { parentId: card, index: 0 });
    const first = state().saveAsBlock(card)!;
    state().saveAsBlock(card);
    state().saveAsBlock(card, '  Hero  ');
    expect(blocks().map((b) => b.name)).toEqual(['Card', 'Card 2', 'Hero']);
    expect(blocks()[0]?.root).toEqual(findNode(state().root, card));

    // Later page edits don't change the saved block.
    state().updateProps(card, { title: 'Changed' });
    expect(blocks().find((b) => b.id === first)?.root.props.title).toBe('Card title');
  });

  it('inserts fresh copies and is undoable', () => {
    const tag = state().addNode('Tag', { parentId: ROOT_ID, index: 0 });
    const block = state().saveAsBlock(tag)!;
    const copy = state().insertBlock(block, { parentId: ROOT_ID, index: 1 })!;
    expect(copy).not.toBe(tag);
    expect(state().root.children.map((c) => c.component)).toEqual(['Tag', 'Tag']);
    expect(state().selectedId).toBe(copy);

    state().undo(); // the insert
    state().undo(); // the save
    expect(blocks()).toEqual([]);
  });

  it('removes blocks and ignores the root, missing nodes and missing blocks', () => {
    const tag = state().addNode('Tag', { parentId: ROOT_ID, index: 0 });
    const block = state().saveAsBlock(tag)!;
    expect(state().saveAsBlock(ROOT_ID)).toBeNull();
    expect(state().saveAsBlock('missing')).toBeNull();
    const steps = state().past.length;
    state().removeCustomBlock('missing');
    expect(state().past).toHaveLength(steps);
    state().removeCustomBlock(block);
    expect(blocks()).toEqual([]);
  });

  it('loads custom blocks with a project and defaults to none', () => {
    const customBlocks = [{ id: 'b', name: 'Tag', root: createRoot() }];
    state().loadProject({ name: 'P', root: createRoot(), theme: createTheme(), customBlocks });
    expect(blocks()).toEqual(customBlocks);
    state().loadProject({ name: 'P', root: createRoot(), theme: createTheme() });
    expect(blocks()).toEqual([]);
  });
});
