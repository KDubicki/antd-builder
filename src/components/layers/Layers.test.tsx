import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { ConfigProvider } from 'antd';
import { beforeEach, describe, expect, it } from 'vitest';
import { useEditorStore } from '@/lib/editor/store';
import { createNode } from '@/lib/registry';
import { Layers } from './Layers';
import { createRoot } from '@/lib/tree';

const card = { ...createNode('Card', 'card'), children: [createNode('Button', 'btn')] };

beforeEach(() =>
  useEditorStore.setState({
    root: { ...createRoot(), children: [card, createNode('Tag', 'tag')] },
    selectedId: null,
  }),
);

const layer = (text: string) => screen.getByText(text).closest('.ant-tree-treenode');

describe('Layers', () => {
  it('shows the whole page tree, expanded', () => {
    render(<Layers />);
    expect(screen.getByText('Page')).toBeInTheDocument();
    expect(screen.getByText('Card')).toBeInTheDocument();
    expect(screen.getByText('Card title')).toBeInTheDocument(); // hint
    expect(screen.getByText('Button')).toBeInTheDocument();
    expect(screen.getByText('Tag')).toBeInTheDocument();
  });

  it('selects the clicked layer and highlights the selection', () => {
    render(<Layers />);
    fireEvent.click(screen.getByText('Tag'));
    expect(useEditorStore.getState().selectedId).toBe('tag');
    expect(layer('Tag')).toHaveClass('ant-tree-treenode-selected');

    // Clicking the selected layer again keeps it selected.
    fireEvent.click(screen.getByText('Tag'));
    expect(useEditorStore.getState().selectedId).toBe('tag');

    act(() => useEditorStore.getState().select('btn'));
    expect(layer('Button')).toHaveClass('ant-tree-treenode-selected');
    expect(layer('Tag')).not.toHaveClass('ant-tree-treenode-selected');
  });

  it('opens the component commands on right-click', () => {
    render(<Layers />);
    fireEvent.contextMenu(screen.getByText('Tag'));
    expect(useEditorStore.getState().selectedId).toBe('tag');
    fireEvent.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: /Move up/ }));
    expect(useEditorStore.getState().root.children.map((child) => child.id)).toEqual([
      'tag',
      'card',
    ]);
  });

  it('offers only Paste on the page', () => {
    render(<Layers />);
    fireEvent.contextMenu(screen.getByText('Page'));
    const items = within(screen.getByRole('menu')).getAllByRole('menuitem');
    expect(items.map((item) => item.textContent)).toEqual(['PasteCtrl/⌘+V']);
  });

  it('filters the outline, keeping the way to each match', () => {
    render(<Layers />);
    const filter = screen.getByLabelText('Filter layers');
    fireEvent.change(filter, { target: { value: 'button' } });
    expect(screen.getByText('Page')).toBeInTheDocument();
    expect(screen.getByText('Card')).toBeInTheDocument();
    expect(screen.getByText('Button')).toBeInTheDocument();
    expect(screen.queryByText('Tag')).not.toBeInTheDocument();

    fireEvent.change(filter, { target: { value: 'zzz' } });
    expect(screen.getByText('No layers match')).toBeInTheDocument();

    fireEvent.keyDown(filter, { key: 'Escape' });
    expect(filter).toHaveValue('');
    expect(screen.getByText('Tag')).toBeInTheDocument();
  });

  describe('expansion', () => {
    // Without motion, collapsed layers leave the DOM right away (jsdom never ends transitions).
    const renderLayers = () =>
      render(
        <ConfigProvider theme={{ token: { motion: false } }}>
          <Layers />
        </ConfigProvider>,
      );
    const toggle = (text: string) =>
      fireEvent.click(layer(text)!.querySelector('.ant-tree-switcher')!);

    // Re-expanding is covered by e2e: rc-tree ignores toggles while its list motion runs,
    // and that motion never ends in jsdom.
    it('collapses a layer', () => {
      renderLayers();
      toggle('Card');
      expect(screen.queryByText('Button')).not.toBeInTheDocument();
    });

    it('reveals the selection inside a collapsed layer', () => {
      renderLayers();
      toggle('Card');
      act(() => useEditorStore.getState().select('btn'));
      expect(screen.getByText('Button')).toBeInTheDocument();
      act(() => useEditorStore.getState().select(null));
      expect(screen.queryByText('Button')).not.toBeInTheDocument();
    });
  });
});
