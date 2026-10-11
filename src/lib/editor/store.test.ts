import { beforeEach, describe, expect, it } from 'vitest';
import { findNode } from '@/lib/tree';
import { ROOT_ID, createRoot, useEditorStore } from './store';

const state = () => useEditorStore.getState();

beforeEach(() => useEditorStore.setState({ root: createRoot(), selectedId: null }));

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

  it('selects and deselects', () => {
    state().select('x');
    expect(state().selectedId).toBe('x');
    state().select(null);
    expect(state().selectedId).toBeNull();
  });
});
