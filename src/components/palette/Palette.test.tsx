import { DndContext } from '@dnd-kit/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App } from 'antd';
import { beforeEach, describe, expect, it } from 'vitest';
import { categoryLabels, components, getComponentMeta } from '@/lib/registry';
import { blocks } from '@/lib/blocks';
import { createRoot, useEditorStore } from '@/lib/editor/store';
import { createNode } from '@/lib/registry';
import { Palette, matchesQuery } from './Palette';

const renderPalette = () =>
  render(
    <App>
      <DndContext>
        <Palette />
      </DndContext>
    </App>,
  );

const listed = () =>
  components.filter((meta) => screen.queryByTitle(meta.description)).map((meta) => meta.name);

describe('matchesQuery', () => {
  const button = getComponentMeta('Button')!;

  it('matches everything for an empty or blank query', () => {
    expect(matchesQuery(button, '')).toBe(true);
    expect(matchesQuery(button, '   ')).toBe(true);
  });

  it('matches label, name and description terms, ignoring case', () => {
    expect(matchesQuery(button, 'BUTTON')).toBe(true);
    expect(matchesQuery(getComponentMeta('Input.Search')!, 'input search')).toBe(true);
    expect(matchesQuery(button, button.description.split(' ')[0]!)).toBe(true);
  });

  it('requires every term to match', () => {
    expect(matchesQuery(button, 'button zzz')).toBe(false);
  });
});

describe('Palette', () => {
  it('lists every registry component under its category', () => {
    const { container } = render(
      <DndContext>
        <Palette />
      </DndContext>,
    );
    const used = new Set(components.map((meta) => meta.category));
    const headings = [...container.querySelectorAll('strong')].map((el) => el.textContent);
    expect(headings).toEqual([
      'Blocks',
      ...Object.entries(categoryLabels)
        .filter(([category]) => used.has(category as keyof typeof categoryLabels))
        .map(([, label]) => label),
    ]);
    for (const block of blocks) {
      expect(screen.getByTitle(block.description)).toHaveTextContent(block.label);
    }
    for (const meta of components) {
      expect(screen.getByTitle(meta.description)).toHaveTextContent(meta.label);
    }
  });
});

describe('Palette search', () => {
  it('filters components and hides empty categories', () => {
    const { container } = renderPalette();
    fireEvent.change(screen.getByLabelText('Search components'), { target: { value: 'picker' } });

    expect(listed().length).toBeGreaterThan(0);
    expect(listed()).toEqual(
      components.filter((meta) => matchesQuery(meta, 'picker')).map((meta) => meta.name),
    );
    expect(listed()).toContain('DatePicker');
    expect(listed()).not.toContain('Button');
    const headings = [...container.querySelectorAll('strong')].map((el) => el.textContent);
    expect(headings).toEqual(['Data entry']);
  });

  it('shows an empty state when nothing matches', () => {
    renderPalette();
    fireEvent.change(screen.getByLabelText('Search components'), { target: { value: 'zzz' } });
    expect(listed()).toEqual([]);
    expect(screen.getByText('No components match')).toBeInTheDocument();
  });

  it('clears the search with Escape', () => {
    renderPalette();
    const search = screen.getByLabelText('Search components');
    fireEvent.change(search, { target: { value: 'zzz' } });
    fireEvent.keyDown(search, { key: 'Escape' });
    expect(search).toHaveValue('');
    expect(listed()).toHaveLength(components.length);
  });
});

describe('Palette blocks search', () => {
  it('finds blocks by label or description', () => {
    renderPalette();
    fireEvent.change(screen.getByLabelText('Search components'), {
      target: { value: 'password' },
    });
    expect(screen.getByText('Sign-in form')).toBeInTheDocument();
    expect(screen.queryByText('User table')).not.toBeInTheDocument();
  });
});

describe('My blocks', () => {
  beforeEach(() =>
    useEditorStore.setState({
      root: { ...createRoot(), children: [createNode('Tag', 'tag')] },
      customBlocks: [],
    }),
  );

  it('lists saved blocks, finds them by name and deletes them', async () => {
    useEditorStore.getState().saveAsBlock('tag', 'Promo tag');
    renderPalette();
    expect(screen.getByText('My blocks')).toBeInTheDocument();
    expect(screen.getByText('Promo tag')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Search components'), { target: { value: 'promo' } });
    expect(screen.getByText('Promo tag')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Search components'), { target: { value: '' } });

    fireEvent.click(screen.getByRole('button', { name: 'Delete block Promo tag' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(useEditorStore.getState().customBlocks).toEqual([]));
    expect(screen.queryByText('My blocks')).not.toBeInTheDocument();
  });

  it('adds components and blocks by click or keyboard', async () => {
    useEditorStore.setState({ root: createRoot(), selectedId: null, past: [], future: [] });
    renderPalette();
    const kids = () => useEditorStore.getState().root.children.map((c) => c.component);
    fireEvent.click(screen.getByTitle(getComponentMeta('Button')!.description));
    expect(kids()).toEqual(['Button']);
    fireEvent.keyDown(screen.getByTitle(getComponentMeta('Tag')!.description), { key: 'Enter' });
    fireEvent.keyDown(screen.getByTitle(getComponentMeta('Tag')!.description), { key: ' ' });
    fireEvent.keyDown(screen.getByTitle(getComponentMeta('Tag')!.description), { key: 'a' });
    expect(kids()).toEqual(['Button', 'Tag', 'Tag']);
    fireEvent.click(screen.getByText('Page header'));
    expect(kids()).toHaveLength(4);

    fireEvent.click(screen.getByTitle(getComponentMeta('Col')!.description));
    expect(
      await screen.findByText('Grid column goes inside Grid row: select one first'),
    ).toBeInTheDocument();
  });
});
