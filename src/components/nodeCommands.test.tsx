import { beforeEach, describe, expect, it } from 'vitest';
import { useEditorStore } from '@/lib/editor/store';
import { createNode } from '@/lib/registry';
import { commandTitle, nodeCommands } from './nodeCommands';
import { ROOT_ID, createRoot } from '@/lib/tree';

const state = () => useEditorStore.getState();
const ids = () => state().root.children.map((child) => child.id);

beforeEach(() =>
  useEditorStore.setState({
    root: { ...createRoot(), children: [createNode('Tag', 'a'), createNode('Tag', 'b')] },
    selectedId: null,
    clipboard: null,
    propsClipboard: null,
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

  it('copy props from anything but the page, and paste them onto the same kind', () => {
    const { copyProps, pasteProps, resetProps } = nodeCommands;
    useEditorStore.setState({
      root: {
        ...createRoot(),
        children: [
          { ...createNode('Tag', 'a'), props: { children: 'Hot', color: 'red' } },
          createNode('Tag', 'b'),
          createNode('Button', 'c'),
        ],
      },
    });
    expect(copyProps.enabled(state(), ROOT_ID)).toBe(false);
    expect(pasteProps.enabled(state(), 'b')).toBe(false); // nothing copied yet

    copyProps.run(state(), 'a');
    expect(pasteProps.enabled(state(), 'b')).toBe(true);
    expect(pasteProps.enabled(state(), 'c')).toBe(false);
    expect(pasteProps.enabled(state(), ROOT_ID)).toBe(false);
    pasteProps.run(state(), 'b');
    expect(state().root.children[1]?.props).toEqual({ children: 'Hot', color: 'red' });

    expect(resetProps.enabled(state(), ROOT_ID)).toBe(false);
    expect(resetProps.enabled(state(), 'c')).toBe(false); // already the defaults
    expect(resetProps.enabled(state(), 'b')).toBe(true);
    resetProps.run(state(), 'b');
    expect(resetProps.enabled(state(), 'b')).toBe(false);
  });

  it('show their keys in the title', () => {
    expect(commandTitle(nodeCommands.duplicate)).toBe('Duplicate (Ctrl/⌘+D)');
    expect(commandTitle(nodeCommands.delete)).toBe('Delete');
  });
});
