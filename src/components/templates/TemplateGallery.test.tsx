import { fireEvent, render, screen, within } from '@testing-library/react';
import { App } from 'antd';
import { beforeEach, describe, expect, it } from 'vitest';
import { useEditorStore } from '@/lib/editor/store';
import { createNode } from '@/lib/registry';
import { templates } from '@/lib/templates';
import { createTheme } from '@/lib/theme';
import { createRoot } from '@/lib/tree';
import { TemplateGallery } from './TemplateGallery';

const renderGallery = () =>
  render(
    <App>
      <TemplateGallery />
    </App>,
  );

const openGallery = async () => {
  fireEvent.click(screen.getByRole('button', { name: /Templates/ }));
  return screen.findByRole('list', { name: 'Page templates' });
};

beforeEach(() =>
  useEditorStore.setState({
    name: 'Shop',
    root: createRoot(),
    theme: createTheme(),
    mockData: [],
    versions: [],
    customBlocks: [],
    past: [],
    future: [],
    selectedId: null,
  }),
);

describe('TemplateGallery', () => {
  it('lists every template with its category and data', async () => {
    renderGallery();
    const list = await openGallery();
    expect(within(list).getAllByRole('listitem')).toHaveLength(templates.length);
    const dashboard = within(list).getByRole('group', { name: 'Admin dashboard' });
    expect(dashboard).toHaveTextContent('Apps & dashboards');
    expect(dashboard).toHaveTextContent('Mock data: stats, orders');
  });

  it('starts from a template right away when there is nothing to lose', async () => {
    renderGallery();
    await openGallery();
    fireEvent.click(screen.getByRole('button', { name: 'Use Admin dashboard' }));
    expect(
      await screen.findByText('Started from the Admin dashboard template'),
    ).toBeInTheDocument();
    expect(useEditorStore.getState().name).toBe('Admin dashboard');
    expect(useEditorStore.getState().root.children).not.toHaveLength(0);
  });

  it('asks before replacing work, and keeps it when cancelled', async () => {
    useEditorStore.setState({ root: { ...createRoot(), children: [createNode('Tag', 'tag')] } });
    renderGallery();
    await openGallery();
    fireEvent.click(screen.getByRole('button', { name: 'Use Admin dashboard' }));
    expect(await screen.findByText(/"Shop" will be replaced/)).toBeInTheDocument();
    expect(screen.getAllByText('Start from the Admin dashboard template?')).not.toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(useEditorStore.getState().name).toBe('Shop');

    fireEvent.click(screen.getByRole('button', { name: 'Use Admin dashboard' }));
    const ok = await screen.findAllByRole('button', { name: 'Use template' });
    fireEvent.click(ok.at(-1)!);
    expect(
      await screen.findByText('Started from the Admin dashboard template'),
    ).toBeInTheDocument();
    expect(useEditorStore.getState().name).toBe('Admin dashboard');
  });

  it('searches and filters by category, starting over on each opening', async () => {
    renderGallery();
    let list = await openGallery();
    const search = screen.getByLabelText('Search templates');
    fireEvent.change(search, { target: { value: 'sign' } });
    list = screen.getByRole('list', { name: 'Page templates' });
    expect(
      within(list)
        .getAllByRole('group')
        .map((card) => card.getAttribute('aria-label')),
    ).toEqual(['Sign-in page', 'Sign-up page']);

    fireEvent.change(search, { target: { value: '' } });
    fireEvent.click(screen.getByText('Status pages (3)'));
    list = screen.getByRole('list', { name: 'Page templates' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);

    fireEvent.change(search, { target: { value: 'dashboard' } });
    expect(screen.getByText('No templates match')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Page templates' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    list = await openGallery();
    expect(screen.getByLabelText('Search templates')).toHaveValue('');
    expect(within(list).getAllByRole('listitem')).toHaveLength(templates.length);
  });
});
