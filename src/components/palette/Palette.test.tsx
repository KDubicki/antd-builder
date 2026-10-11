import { DndContext } from '@dnd-kit/core';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { categoryLabels, components } from '@/lib/registry';
import { Palette } from './Palette';

describe('Palette', () => {
  it('lists every registry component under its category', () => {
    render(
      <DndContext>
        <Palette />
      </DndContext>,
    );
    for (const label of Object.values(categoryLabels)) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    for (const meta of components) {
      expect(screen.getByTitle(meta.description)).toHaveTextContent(meta.label);
    }
  });
});
