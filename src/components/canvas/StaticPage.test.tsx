import { render, screen } from '@testing-library/react';
import { resetWarned } from 'antd/es/_util/warning';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNode } from '@/lib/registry';
import type { BuilderNode } from '@/lib/schema';
import { instantiateTemplate, templates } from '@/lib/templates';
import { createTheme } from '@/lib/theme';
import { createRoot } from '@/lib/tree';
import { StaticPage } from './StaticPage';

let warnings: string[] = [];
beforeEach(() => {
  warnings = [];
  resetWarned();
  const record = (...args: unknown[]) => warnings.push(args.map(String).join(' '));
  vi.spyOn(console, 'error').mockImplementation(record);
  vi.spyOn(console, 'warn').mockImplementation(record);
});
afterEach(() => vi.restoreAllMocks());

const page = (...children: BuilderNode[]) => ({ ...createRoot(), children });

describe('StaticPage', () => {
  it('renders bound data under the page theme, without editor chrome', () => {
    const tag = { ...createNode('Tag', 't'), props: { children: { $data: 'd', path: 'label' } } };
    const { container } = render(
      <StaticPage
        root={page(tag, createNode('Card', 'empty'))}
        theme={{ ...createTheme(), token: { colorPrimary: '#ff0000' } }}
        mockData={[{ id: 'd', name: 'data', data: { label: 'From data' } }]}
      />,
    );
    expect(screen.getByText('From data')).toBeInTheDocument();
    expect(screen.queryByText('Drop components here')).not.toBeInTheDocument();
    expect(container.querySelector('[data-node-id]')).toBeNull();
    expect(warnings).toEqual([]);
  });

  it('skips unknown components', () => {
    const unknown = { id: 'x', component: 'Nope', props: {}, children: [] };
    render(<StaticPage root={page(unknown)} theme={createTheme()} mockData={[]} />);
    expect(screen.queryByText(/Unknown component/)).not.toBeInTheDocument();
  });

  it.each(templates.map((template) => [template.id, template] as const))(
    'renders the %s template without warnings',
    (_id, template) => {
      render(<StaticPage {...instantiateTemplate(template)} />);
      expect(warnings).toEqual([]);
    },
  );
});
