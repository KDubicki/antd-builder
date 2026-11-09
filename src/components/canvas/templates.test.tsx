import { DndContext } from '@dnd-kit/core';
import { render, screen } from '@testing-library/react';
import { resetWarned } from 'antd/es/_util/warning';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEditorStore } from '@/lib/editor/store';
import { templates } from '@/lib/templates';
import { Canvas } from './Canvas';

let warnings: string[] = [];
beforeEach(() => {
  warnings = [];
  resetWarned();
  const record = (...args: unknown[]) => warnings.push(args.map(String).join(' '));
  vi.spyOn(console, 'error').mockImplementation(record);
  vi.spyOn(console, 'warn').mockImplementation(record);
});
afterEach(() => vi.restoreAllMocks());

describe.each(templates.map((template) => [template.id] as const))(
  'template %s on the canvas',
  (id) => {
    it('renders without warnings', () => {
      useEditorStore.getState().loadTemplate(id);
      render(
        <DndContext>
          <Canvas />
        </DndContext>,
      );
      expect(screen.queryByText(/Unknown component/)).not.toBeInTheDocument();
      expect(warnings).toEqual([]);
    });
  },
);

it('the dashboard shows its orders', () => {
  useEditorStore.getState().loadTemplate('dashboard');
  render(
    <DndContext>
      <Canvas />
    </DndContext>,
  );
  expect(screen.getByRole('cell', { name: 'Carol White' })).toBeInTheDocument();
  expect(screen.getByText('Goals this month')).toBeInTheDocument();
});

it('the landing page shows every section with its data', () => {
  useEditorStore.getState().loadTemplate('landing');
  render(
    <DndContext>
      <Canvas />
    </DndContext>,
  );
  expect(screen.getByRole('heading', { name: 'Build antd pages in minutes' })).toBeInTheDocument();
  expect(screen.getByText('Business')).toBeInTheDocument();
  expect(screen.getByText('Maria Lopez')).toBeInTheDocument();
  expect(screen.getByText('Is there a free trial?')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Start for free' })).toBeInTheDocument();
});

it('the account pages show their forms', () => {
  useEditorStore.getState().loadTemplate('sign-up');
  const { unmount } = render(
    <DndContext>
      <Canvas />
    </DndContext>,
  );
  expect(screen.getByText('Workspace')).toBeInTheDocument();
  expect(screen.getByPlaceholderText('you@company.com')).toBeInTheDocument();
  unmount();

  useEditorStore.getState().loadTemplate('sign-in');
  render(
    <DndContext>
      <Canvas />
    </DndContext>,
  );
  expect(screen.getByRole('checkbox', { name: 'Remember me' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeInTheDocument();
});
