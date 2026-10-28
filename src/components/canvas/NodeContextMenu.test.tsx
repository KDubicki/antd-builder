import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App } from 'antd';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
    propsClipboard: null,
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
    fireEvent.click(item(openMenu(screen.getByText('First')), /^copy Copy/));
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

  it('copies props from one component onto another in a submenu', async () => {
    render(<Canvas />);
    fireEvent.mouseEnter(item(openMenu(screen.getByText('First')), /Props/));
    fireEvent.click(await screen.findByRole('menuitem', { name: /Copy props/ }));
    expect(state().propsClipboard?.props).toEqual({ children: 'First' });

    // The submenu stays rendered once opened, so reopening the menu shows Paste props again.
    fireEvent.contextMenu(screen.getByText('Second'));
    expect(state().selectedId).toBe('b');
    fireEvent.click(screen.getByRole('menuitem', { name: /Paste props/ }));
    expect(state().root.children.map((child) => child.props.children)).toEqual(['First', 'First']);
  });

  it('copies a component as JSX and says so', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    render(
      <App>
        <Canvas />
      </App>,
    );
    fireEvent.click(item(openMenu(screen.getByText('First')), /Copy JSX/));
    expect(writeText).toHaveBeenCalledWith('<Tag>First</Tag>');
    expect(await screen.findByText('Copied Tag as JSX')).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it('explains when the clipboard refuses the JSX', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    render(
      <App>
        <Canvas />
      </App>,
    );
    fireEvent.click(item(openMenu(screen.getByText('First')), /Copy JSX/));
    await waitFor(() =>
      expect(
        screen.getByText('Copying is not allowed here; use Export code instead'),
      ).toBeInTheDocument(),
    );
    vi.unstubAllGlobals();
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
