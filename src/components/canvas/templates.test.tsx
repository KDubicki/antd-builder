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

it('the customer list shows its records and filters', () => {
  useEditorStore.getState().loadTemplate('crud-list');
  render(
    <DndContext>
      <Canvas />
    </DndContext>,
  );
  expect(screen.getByRole('cell', { name: 'eve@example.com' })).toBeInTheDocument();
  expect(screen.getByPlaceholderText('Search by name or email')).toBeInTheDocument();
  expect(
    screen.getByText('Churned', { selector: '.ant-segmented-item-label' }),
  ).toBeInTheDocument();
});

it('the settings page shows its sections and billing data', () => {
  useEditorStore.getState().loadTemplate('settings');
  render(
    <DndContext>
      <Canvas />
    </DndContext>,
  );
  expect(screen.getAllByRole('switch')).toHaveLength(3);
  expect(screen.getByText('Visa ending 4242')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Delete account' })).toBeInTheDocument();
});

it('the product page shows the product and related items', () => {
  useEditorStore.getState().loadTemplate('product');
  render(
    <DndContext>
      <Canvas />
    </DndContext>,
  );
  expect(screen.getByRole('heading', { name: 'Cloud Runner 3' })).toBeInTheDocument();
  expect(screen.getByText('128 reviews')).toBeInTheDocument();
  expect(screen.getByText('Race Day Elite')).toBeInTheDocument();
  expect(screen.getByRole('radio', { name: '42' })).toBeChecked();
});

it('the blog article shows its post, author and comments', () => {
  useEditorStore.getState().loadTemplate('article');
  render(
    <DndContext>
      <Canvas />
    </DndContext>,
  );
  expect(
    screen.getByRole('heading', { name: 'How we rebuilt our admin panel in two weeks' }),
  ).toBeInTheDocument();
  expect(screen.getAllByText('Maria Lopez')).toHaveLength(2);
  expect(screen.getByText(/Would love a follow-up/)).toBeInTheDocument();
});
