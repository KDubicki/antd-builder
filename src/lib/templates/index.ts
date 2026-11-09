import { type Block, getBlock, node } from '@/lib/blocks';
import { createDataSource } from '@/lib/mockData';
import type { BuilderNode, DataSource, ProjectTheme } from '@/lib/schema';
import { createTheme, themePresets } from '@/lib/theme';
import { createRoot } from '@/lib/tree';

export type TemplateCategory = 'app' | 'marketing' | 'account' | 'content' | 'status';

export const templateCategoryLabels: Readonly<Record<TemplateCategory, string>> = {
  app: 'Apps & dashboards',
  marketing: 'Marketing',
  account: 'Account',
  content: 'Content & shop',
  status: 'Status pages',
};

type SampleData = Pick<DataSource, 'name' | 'data'>;

/** Looks up a data source's id by its name while a template builds its tree. */
export type SourceLookup = (name: string) => string;

/** A whole page to start a project from: its tree, theme and the mock data it reads. */
export interface PageTemplate {
  id: string;
  label: string;
  description: string;
  category: TemplateCategory;
  /** Id of the theme preset the page starts with (antd's default when unset). */
  preset?: string;
  /** Mock data the page reads, by name. */
  data?: readonly SampleData[];
  /** Builds the page's top-level nodes, with fresh ids. */
  build: (source: SourceLookup) => BuilderNode[];
}

/** What a template turns into: everything a project needs besides blocks and versions. */
export interface TemplateContent {
  name: string;
  root: BuilderNode;
  theme: ProjectTheme;
  mockData: DataSource[];
}

function requireBlock(id: string): Block {
  const block = getBlock(id);
  if (!block) throw new Error(`Unknown block: ${id}`);
  return block;
}

/** A ready-made block's mock data, for a template's `data`. */
function blockData(id: string): SampleData {
  const { data } = requireBlock(id);
  if (!data) throw new Error(`Block ${id} has no data`);
  return data;
}

/** A ready-made block's tree, bound to the template's copy of its data. */
function fromBlock(id: string, source: SourceLookup): BuilderNode {
  const block = requireBlock(id);
  return block.build(block.data ? source(block.data.name) : '');
}

export const templates: readonly PageTemplate[] = [
  {
    id: 'dashboard',
    label: 'Admin dashboard',
    description: 'Side menu, key numbers, recent orders, goals and team activity.',
    category: 'app',
    data: [
      blockData('stats'),
      {
        name: 'orders',
        data: [
          { key: '1', order: '#1024', customer: 'Alice Johnson', status: 'Paid', total: 129.9 },
          { key: '2', order: '#1023', customer: 'Bob Smith', status: 'Shipped', total: 54 },
          { key: '3', order: '#1022', customer: 'Carol White', status: 'Pending', total: 310.5 },
          { key: '4', order: '#1021', customer: 'Dan Brown', status: 'Paid', total: 18.25 },
        ],
      },
    ],
    build: (source) => [
      node('Row', { gutter: 24, verticalGutter: 16 }, [
        node('Col', { span: 5, xs: 24, md: 6, lg: 5 }, [
          node('Card', { title: 'Acme admin', size: 'small' }, [
            node('Menu', {
              mode: 'inline',
              selectedKeys: ['dashboard'],
              items: [
                { key: 'dashboard', label: 'Dashboard' },
                { key: 'orders', label: 'Orders' },
                { key: 'customers', label: 'Customers' },
                { key: 'reports', label: 'Reports' },
                { key: 'settings', label: 'Settings' },
              ],
            }),
          ]),
        ]),
        node('Col', { span: 19, xs: 24, md: 18, lg: 19 }, [
          node('Flex', { vertical: true, gap: 'middle' }, [
            fromBlock('page-header', source),
            fromBlock('stats', source),
            node('Row', { gutter: 16, verticalGutter: 16 }, [
              node('Col', { span: 16, xs: 24, lg: 16 }, [
                node('Card', { title: 'Recent orders' }, [
                  node('Table', {
                    columns: [
                      { title: 'Order', dataIndex: 'order', key: 'order' },
                      { title: 'Customer', dataIndex: 'customer', key: 'customer' },
                      { title: 'Status', dataIndex: 'status', key: 'status' },
                      { title: 'Total ($)', dataIndex: 'total', key: 'total' },
                    ],
                    dataSource: { $data: source('orders') },
                    pagination: false,
                    size: 'small',
                    horizontalScroll: true,
                  }),
                ]),
              ]),
              node('Col', { span: 8, xs: 24, lg: 8 }, [
                node('Flex', { vertical: true, gap: 'middle' }, [
                  node('Card', { title: 'Goals this month' }, [
                    node('Flex', { vertical: true }, [
                      node('Typography.Text', { children: 'Revenue', type: 'secondary' }),
                      node('Progress', { percent: 72 }),
                      node('Typography.Text', { children: 'New customers', type: 'secondary' }),
                      node('Progress', { percent: 45 }),
                      node('Typography.Text', { children: 'Tickets closed', type: 'secondary' }),
                      node('Progress', { percent: 100, status: 'success' }),
                    ]),
                  ]),
                  node('Card', { title: 'Activity' }, [
                    node('Timeline', {
                      items: [
                        { title: '09:12', content: 'Alice paid order #1024' },
                        { title: '10:40', content: 'Bob’s order #1023 shipped' },
                        { title: '13:05', content: 'Carol placed order #1022' },
                      ],
                    }),
                  ]),
                ]),
              ]),
            ]),
          ]),
        ]),
      ]),
    ],
  },
];

export function getTemplate(id: string): PageTemplate | undefined {
  return templates.find((template) => template.id === id);
}

/** The project content for a template: fresh ids, its own copy of the data and theme. */
export function instantiateTemplate(template: PageTemplate): TemplateContent {
  const mockData = (template.data ?? []).map((sample) =>
    createDataSource(sample.name, structuredClone(sample.data)),
  );
  const source: SourceLookup = (name) => {
    const found = mockData.find((candidate) => candidate.name === name);
    if (!found) throw new Error(`Template ${template.id} has no data source "${name}"`);
    return found.id;
  };
  const preset = themePresets.find((candidate) => candidate.id === template.preset);
  return {
    name: template.label,
    root: { ...createRoot(), children: template.build(source) },
    theme: structuredClone(preset?.theme ?? createTheme()),
    mockData,
  };
}
