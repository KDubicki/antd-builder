import { DndContext } from '@dnd-kit/core';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { categoryLabels, components } from '@/lib/registry';
import { Palette } from './Palette';

describe('Palette', () => {
  it('lists every registry component under its category', () => {
    const { container } = render(
      <DndContext>
        <Palette />
      </DndContext>,
    );
    const used = new Set(components.map((meta) => meta.category));
    const headings = [...container.querySelectorAll('strong')].map((el) => el.textContent);
    expect(headings).toEqual(
      Object.entries(categoryLabels)
        .filter(([category]) => used.has(category as keyof typeof categoryLabels))
        .map(([, label]) => label),
    );
    for (const meta of components) {
      expect(screen.getByTitle(meta.description)).toHaveTextContent(meta.label);
    }
  });
});
