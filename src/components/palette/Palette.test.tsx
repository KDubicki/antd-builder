import { DndContext } from '@dnd-kit/core';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { categoryLabels, components, getComponentMeta } from '@/lib/registry';
import { blocks } from '@/lib/blocks';
import { Palette, matchesQuery } from './Palette';

const renderPalette = () =>
  render(
    <DndContext>
      <Palette />
    </DndContext>,
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
