import { beforeEach, describe, expect, it } from 'vitest';
import { ROOT_ID, createRoot, useEditorStore } from '@/lib/editor/store';
import { createNode } from '@/lib/registry';
import { commandTitle, nodeCommands } from './nodeCommands';

const state = () => useEditorStore.getState();
const ids = () => state().root.children.map((child) => child.id);

beforeEach(() =>
  useEditorStore.setState({
    root: { ...createRoot(), children: [createNode('Tag', 'a'), createNode('Tag', 'b')] },
    selectedId: null,
    clipboard: null,
    past: [],
    future: [],
  }),
);

describe('node commands', () => {
  it('move a component only where it can go', () => {
    const { moveUp, moveDown } = nodeCommands;
    expect(moveUp.enabled(state(), 'a')).toBe(false);
    expect(moveUp.enabled(state(), 'b')).toBe(true);
    expect(moveDown.enabled(state(), 'b')).toBe(false);
    expect(moveDown.enabled(state(), ROOT_ID)).toBe(false);
    moveDown.run(state(), 'a');
    expect(ids()).toEqual(['b', 'a']);
    moveUp.run(state(), 'a');
    expect(ids()).toEqual(['a', 'b']);
  });

  it('duplicate, copy, cut and delete anything but the page', () => {
    for (const command of ['duplicate', 'copy', 'cut', 'delete'] as const) {
      expect(nodeCommands[command].enabled(state(), ROOT_ID)).toBe(false);
      expect(nodeCommands[command].enabled(state(), 'a')).toBe(true);
    }
    nodeCommands.duplicate.run(state(), 'a');
    expect(ids()).toHaveLength(3);
    nodeCommands.copy.run(state(), 'b');
    expect(state().clipboard?.component).toBe('Tag');
    nodeCommands.cut.run(state(), 'b');
    nodeCommands.delete.run(state(), 'a');
    expect(ids()).toHaveLength(1);
  });

  it('show their keys in the title', () => {
    expect(commandTitle(nodeCommands.duplicate)).toBe('Duplicate (Ctrl/⌘+D)');
    expect(commandTitle(nodeCommands.delete)).toBe('Delete');
  });
});
