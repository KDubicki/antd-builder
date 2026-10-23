import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useEditorStore } from '@/lib/editor/store';
import { createNode } from '@/lib/registry';
import { Canvas } from './Canvas';
import { ROOT_ID, createRoot } from '@/lib/tree';

const state = () => useEditorStore.getState();
const ids = () => state().root.children.map((child) => child.id);

beforeEach(() =>
  useEditorStore.setState({
    root: {
      ...createRoot(),
      children: [
        { ...createNode('Tag', 'a'), props: { children: 'First' } },
        { ...createNode('Tag', 'b'), props: { children: 'Second' } },
      ],
    },
    selectedId: null,
    clipboard: null,
    previewMode: false,
    past: [],
    future: [],
  }),
);

const openMenu = (target: Element) => {
  fireEvent.contextMenu(target);
  return screen.getByRole('menu');
};

const item = (menu: HTMLElement, name: RegExp) => within(menu).getByRole('menuitem', { name });

describe('NodeContextMenu', () => {
  it('selects the component under the pointer and runs commands on it', () => {
    render(<Canvas />);
    const menu = openMenu(screen.getByText('Second'));
    expect(state().selectedId).toBe('b');
    expect(item(menu, /Move down/)).toHaveAttribute('aria-disabled', 'true');
    expect(item(menu, /Paste/)).toHaveAttribute('aria-disabled', 'true');
    expect(item(menu, /Unwrap/)).toHaveAttribute('aria-disabled', 'true');
    expect(within(menu).getByText('Ctrl/⌘+D')).toBeInTheDocument();

    fireEvent.click(item(menu, /Move up/));
    expect(ids()).toEqual(['b', 'a']);
  });

  it('copies and pastes, and offers only Paste on the page itself', () => {
    render(<Canvas />);
    fireEvent.click(item(openMenu(screen.getByText('First')), /Copy/));
    expect(state().clipboard?.props.children).toBe('First');

    const menu = openMenu(screen.getByTestId('canvas'));
    expect(state().selectedId).toBe(ROOT_ID);
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((el) => el.textContent),
    ).toEqual(['PasteCtrl/⌘+V']);
    fireEvent.click(item(menu, /Paste/));
    expect(ids()).toHaveLength(3);
  });

  it('groups the wrap commands in a submenu', async () => {
    render(<Canvas />);
    const menu = openMenu(screen.getByText('First'));
    expect(within(menu).queryByRole('menuitem', { name: /Wrap in Card/ })).toBeNull();
    fireEvent.mouseEnter(item(menu, /Wrap in/));
    fireEvent.click(await screen.findByRole('menuitem', { name: /^border-outer Card$/ }));
    expect(state().root.children[0]?.component).toBe('Card');
    expect(state().root.children[0]?.children.map((child) => child.id)).toEqual(['a']);
  });

  it('selects the parent', () => {
    render(<Canvas />);
    fireEvent.click(item(openMenu(screen.getByText('First')), /Select parent/));
    expect(state().selectedId).toBe(ROOT_ID);
  });

  it('deletes the component', () => {
    render(<Canvas />);
    fireEvent.click(item(openMenu(screen.getByText('First')), /Delete/));
    expect(ids()).toEqual(['b']);
  });

  it('stays closed in preview', () => {
    useEditorStore.setState({ previewMode: true });
    render(<Canvas />);
    fireEvent.contextMenu(screen.getByText('First'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(state().selectedId).toBeNull();
  });
});
