import { beforeEach, describe, expect, it } from 'vitest';
import { createTheme } from '@/lib/theme';
import { findNode } from '@/lib/tree';
import { ROOT_ID, createRoot, useEditorStore } from './store';

const state = () => useEditorStore.getState();

beforeEach(() =>
  useEditorStore.setState({ root: createRoot(), theme: createTheme(), selectedId: null }),
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
